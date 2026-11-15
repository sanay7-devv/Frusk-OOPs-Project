package com.iitsm.infrastructure.notification;

import java.util.List;
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
import com.iitsm.domain.notification.PushDevice;
import com.iitsm.domain.notification.PushGateway;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.NotificationRepository;
import com.iitsm.domain.repository.PushDeviceRepository;
import com.iitsm.domain.repository.UserRepository;

/**
 * Adapter (A4, decision DEC-117): a push to every device the person registered. Nothing happens for someone with no
 * device. Like the simulated text message it also stores one row with channel PUSH_SIM, so
 * {@code GET /notifications?channel=PUSH_SIM} shows what was pushed, which is what makes it demonstrable without a phone.
 * A device the gateway cannot reach is logged and skipped; the others still get the message.
 */
@Component
public class PushSimulatedChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(PushSimulatedChannel.class);

    private final PushDeviceRepository devices;
    private final PushGateway gateway;
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final IncidentRepository incidents;

    public PushSimulatedChannel(PushDeviceRepository devices, PushGateway gateway,
                                NotificationRepository notifications, UserRepository users,
                                IncidentRepository incidents) {
        this.devices = devices;
        this.gateway = gateway;
        this.notifications = notifications;
        this.users = users;
        this.incidents = incidents;
    }

    @Override
    public ChannelType type() {
        return ChannelType.PUSH_SIM;
    }

    @Override
    @Transactional
    public Optional<Long> send(NotificationMessage message) {
        List<PushDevice> targets = devices.findByUser_IdOrderByIdAsc(message.recipientId());
        if (targets.isEmpty()) {
            return Optional.empty();
        }
        int reached = 0;
        for (PushDevice device : targets) {
            try {
                gateway.send(device, message.title(), message.message());
                reached++;
            } catch (Exception ex) {
                log.warn("Push to device {} of user {} failed: {}", device.tokenHint(), message.recipientId(),
                        ex.toString());
            }
        }
        if (reached == 0) {
            return Optional.empty();
        }
        var user = users.findById(message.recipientId())
                .orElseThrow(() -> new UserNotFoundException(message.recipientId()));
        var incident = message.incidentId() == null ? null
                : incidents.findById(message.incidentId())
                        .orElseThrow(() -> new IncidentNotFoundException(message.incidentId()));
        Notification saved = notifications.save(new Notification(user, message.eventType(), ChannelType.PUSH_SIM,
                message.title(), message.message(), incident, message.createdAt()));
        return Optional.of(saved.getId());
    }
}
