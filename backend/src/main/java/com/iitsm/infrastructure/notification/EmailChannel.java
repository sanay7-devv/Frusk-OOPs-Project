package com.iitsm.infrastructure.notification;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.notification.ChannelType;
import com.iitsm.domain.notification.NotificationChannel;
import com.iitsm.domain.notification.NotificationMessage;

import jakarta.mail.internet.MimeMessage;

/**
 * Adapter: HTML email through SMTP, to the mail catcher (Mailpit on localhost:1025) in development.
 * <p>
 * Sending never blocks the notification thread: the message is handed to a small scheduler, which tries once and then
 * retries with a doubling wait ({@code notification.email.retries}, {@code notification.email.backoff.seconds}).
 * After the last try the mail is dropped and logged; the inbox row is the durable record (decision DEC-42). The
 * address of the person is never written to the log, only their user id.
 */
@Component
public class EmailChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(EmailChannel.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final ScheduledExecutorService scheduler;
    private final ConfigService config;
    private final String htmlShell;

    public EmailChannel(ObjectProvider<JavaMailSender> mailSender,
                        @org.springframework.beans.factory.annotation.Qualifier("notificationRetryScheduler")
                        ScheduledExecutorService scheduler, ConfigService config) throws IOException {
        this.mailSender = mailSender;
        this.scheduler = scheduler;
        this.config = config;
        try (InputStream in = new ClassPathResource("notification-email.html").getInputStream()) {
            this.htmlShell = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Override
    public ChannelType type() {
        return ChannelType.EMAIL;
    }

    @Override
    public Optional<Long> send(NotificationMessage message) {
        if (message.recipientEmail() == null || message.recipientEmail().isBlank()) {
            throw new IllegalArgumentException("user " + message.recipientId() + " has no email address");
        }
        AppSettings settings = config.current();
        int retries = settings.intValue(ConfigKey.NOTIFICATION_EMAIL_RETRIES);
        long backoff = settings.intValue(ConfigKey.NOTIFICATION_EMAIL_BACKOFF_SECONDS);
        String from = settings.raw(ConfigKey.NOTIFICATION_EMAIL_FROM);
        String base = settings.raw(ConfigKey.NOTIFICATION_LINK_BASE_URL);
        scheduler.execute(() -> attempt(message, from, base, 0, retries, backoff));
        return Optional.empty();
    }

    private void attempt(NotificationMessage message, String from, String linkBase, int attempt, int retries,
                         long backoffSeconds) {
        try {
            JavaMailSender sender = mailSender.getIfAvailable();
            if (sender == null) {
                throw new IllegalStateException("no mail sender is configured");
            }
            sender.send(build(sender, message, from, linkBase));
            log.debug("Email {} for user {} sent (attempt {})", message.eventType(), message.recipientId(),
                    attempt + 1);
        } catch (Exception ex) {
            if (attempt < retries) {
                long wait = backoffSeconds << attempt;
                log.warn("Email {} for user {} failed (attempt {} of {}), retrying in {} s: {}", message.eventType(),
                        message.recipientId(), attempt + 1, retries + 1, wait, ex.toString());
                scheduler.schedule(() -> attempt(message, from, linkBase, attempt + 1, retries, backoffSeconds),
                        wait, TimeUnit.SECONDS);
            } else {
                log.error("Email {} for user {} dropped after {} attempts: {}", message.eventType(),
                        message.recipientId(), attempt + 1, ex.toString());
            }
        }
    }

    private MimeMessage build(JavaMailSender sender, NotificationMessage m, String from, String linkBase)
            throws Exception {
        MimeMessage mime = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
        helper.setFrom(from);
        helper.setTo(m.recipientEmail());
        helper.setSubject(oneLine(m.title()));
        String link = m.incidentId() == null ? linkBase : linkBase.replaceAll("/+$", "") + "/incidents/" + m.incidentId();
        String plain = m.message() + "\n\n" + (m.incidentCode() == null ? "" : "Incident " + m.incidentCode() + "\n") + link;
        helper.setText(plain, html(m, link));
        return mime;
    }

    private String html(NotificationMessage m, String link) {
        String priorityLine = m.priority() == null ? "" : " &middot; priority " + escape(m.priority().name());
        return htmlShell
                .replace("{{title}}", escape(m.title()))
                .replace("{{message}}", escape(m.message()))
                .replace("{{code}}", escape(m.incidentCode() == null ? "several" : m.incidentCode()))
                .replace("{{priorityLine}}", priorityLine)
                .replace("{{link}}", escape(link));
    }

    private static String oneLine(String text) {
        return text.replaceAll("[\\r\\n]+", " ");
    }

    /** User-written text (the incident title) ends up in the mail, so it is escaped. */
    private static String escape(String text) {
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
