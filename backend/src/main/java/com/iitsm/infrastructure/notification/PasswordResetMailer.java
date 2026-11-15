package com.iitsm.infrastructure.notification;

import java.util.concurrent.ScheduledExecutorService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import com.iitsm.application.auth.PasswordResetNotifier;
import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.ConfigKey;

/**
 * Adapter: mails the reset link through SMTP (to the mail catcher in development). Sent from the same small scheduler
 * as the notification e-mails so the request does not wait for the mail server, and a mail that cannot be sent is
 * logged without the address (only that a reset mail failed), which also keeps the answer to the request identical
 * for every e-mail.
 */
@Component
public class PasswordResetMailer implements PasswordResetNotifier {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailer.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final ScheduledExecutorService scheduler;
    private final ConfigService config;

    public PasswordResetMailer(ObjectProvider<JavaMailSender> mailSender,
                               @Qualifier("notificationRetryScheduler") ScheduledExecutorService scheduler,
                               ConfigService config) {
        this.mailSender = mailSender;
        this.scheduler = scheduler;
        this.config = config;
    }

    @Override
    public void send(String toEmail, String name, String link, int validMinutes) {
        String from = config.current().raw(ConfigKey.NOTIFICATION_EMAIL_FROM);
        scheduler.execute(() -> {
            try {
                JavaMailSender sender = mailSender.getIfAvailable();
                if (sender == null) {
                    throw new IllegalStateException("no mail sender is configured");
                }
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(from);
                message.setTo(toEmail);
                message.setSubject("Reset your I-ITSM password");
                message.setText("Hello " + name + ",\n\nSomeone asked to reset the password of your I-ITSM account. "
                        + "Open this link within " + validMinutes + " minutes to choose a new one:\n\n" + link
                        + "\n\nIf it was not you, ignore this message; your password stays as it is.");
                sender.send(message);
            } catch (Exception ex) {
                log.error("A password reset mail could not be sent: {}", ex.toString());
            }
        });
    }
}
