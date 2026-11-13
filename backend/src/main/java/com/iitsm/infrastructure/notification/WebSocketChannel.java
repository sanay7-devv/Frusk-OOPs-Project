package com.iitsm.infrastructure.notification;

import java.time.Instant;
import java.util.Optional;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.iitsm.domain.notification.ChannelType;
import com.iitsm.domain.notification.NotificationChannel;
import com.iitsm.domain.notification.NotificationEventType;
import com.iitsm.domain.notification.NotificationMessage;

/**
 * Adapter: a live push to the person's STOMP queue {@code /user/queue/notifications} (handbook B.5).
 * <p>
 * Thin on purpose. Assumption (decision DEC-48): the STOMP session of a logged-in person is named after their user id
 * ({@link WebSocketConfig} sets that from the access token on CONNECT; module M13 will extend that part). The payload
 * is the same Notification object as the REST inbox, with the id of the inbox row, so the browser can mark it read.
 * A person who is not connected simply does not receive it; the inbox row is still there.
 */
@Component
public class WebSocketChannel implements NotificationChannel {

    static final String QUEUE = "/queue/notifications";

    /** The Notification object of API Data Dictionary C.7 as pushed: channel is IN_APP, the row it mirrors. */
    public record Payload(Long id, NotificationEventType eventType, String title, String message, Long incidentId,
                          ChannelType channel, boolean read, Instant createdAt) {
    }

    private final SimpMessagingTemplate messaging;

    public WebSocketChannel(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @Override
    public ChannelType type() {
        return ChannelType.WEBSOCKET;
    }

    @Override
    public Optional<Long> send(NotificationMessage message) {
        messaging.convertAndSendToUser(String.valueOf(message.recipientId()), QUEUE,
                new Payload(message.inboxId(), message.eventType(), message.title(), message.message(),
                        message.incidentId(), ChannelType.IN_APP, false, message.createdAt()));
        return Optional.empty();
    }
}
