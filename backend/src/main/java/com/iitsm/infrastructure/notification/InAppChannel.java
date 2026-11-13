package com.iitsm.infrastructure.notification;

import java.util.Optional;

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

/** Adapter: the inbox. Inserts one row and returns its id; the other channels refer to that row. */
@Component
public class InAppChannel implements NotificationChannel {

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final IncidentRepository incidents;

    public InAppChannel(NotificationRepository notifications, UserRepository users, IncidentRepository incidents) {
        this.notifications = notifications;
        this.users = users;
        this.incidents = incidents;
    }

    @Override
    public ChannelType type() {
        return ChannelType.IN_APP;
    }

    @Override
    @Transactional
    public Optional<Long> send(NotificationMessage message) {
        var user = users.findById(message.recipientId()).orElseThrow(() -> new UserNotFoundException(message.recipientId()));
        var incident = message.incidentId() == null ? null
                : incidents.findById(message.incidentId()).orElseThrow(() -> new IncidentNotFoundException(message.incidentId()));
        Notification saved = notifications.save(new Notification(user, message.eventType(), ChannelType.IN_APP,
                message.title(), message.message(), incident, message.createdAt()));
        return Optional.of(saved.getId());
    }
}
