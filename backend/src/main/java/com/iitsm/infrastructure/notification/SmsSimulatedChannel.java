package com.iitsm.infrastructure.notification;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.exception.IncidentNotFoundException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.notification.ChannelType;
import com.iitsm.domain.notification.Notification;
import com.iitsm.domain.notification.NotificationChannel;
import com.iitsm.domain.notification.NotificationMessage;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.NotificationRepository;
import com.iitsm.domain.repository.UserRepository;

/**
 * Adapter: a simulated text message for P1 incidents (the dispatcher only calls it for those). No phone number
 * exists, so nothing leaves the system: the text goes to the log and to a row with channel SMS_SIM that
 * {@code GET /notifications?channel=SMS_SIM} lists.
 */
@Component
public class SmsSimulatedChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(SmsSimulatedChannel.class);
    private static final int SMS_LENGTH = 160;

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final IncidentRepository incidents;

    public SmsSimulatedChannel(NotificationRepository notifications, UserRepository users,
                               IncidentRepository incidents) {
        this.notifications = notifications;
        this.users = users;
        this.incidents = incidents;
    }

    @Override
    public ChannelType type() {
        return ChannelType.SMS_SIM;
    }

    @Override
    @Transactional
    public Optional<Long> send(NotificationMessage message) {
        var user = users.findById(message.recipientId()).orElseThrow(() -> new UserNotFoundException(message.recipientId()));
        var incident = message.incidentId() == null ? null
                : incidents.findById(message.incidentId()).orElseThrow(() -> new IncidentNotFoundException(message.incidentId()));
        String text = message.title() + ": " + message.message();
        if (text.length() > SMS_LENGTH) {
            text = text.substring(0, SMS_LENGTH - 1) + "…";
        }
        Notification saved = notifications.save(new Notification(user, message.eventType(), ChannelType.SMS_SIM,
                message.title(), text, incident, message.createdAt()));
        log.info("SMS (simulated) to {}: {}", message.recipientName(), text);
        return Optional.of(saved.getId());
    }
}
