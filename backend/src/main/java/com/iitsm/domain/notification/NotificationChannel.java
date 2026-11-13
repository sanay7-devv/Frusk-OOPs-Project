package com.iitsm.domain.notification;

import java.util.Optional;

/**
 * Adapter pattern: one way of delivering a notification (handbook 2.5 M9). The dispatcher knows only this
 * interface; in-app, email, WebSocket, simulated SMS and chat webhook each adapt a different technology to it.
 * <p>
 * A channel throws when it cannot deliver. The dispatcher logs the failure and carries on with the next channel,
 * so one broken channel never stops the others.
 */
public interface NotificationChannel {

    ChannelType type();

    /**
     * Delivers one message.
     *
     * @return the id of the row the channel stored, if it stores one
     * @throws Exception if delivery failed
     */
    Optional<Long> send(NotificationMessage message) throws Exception;
}
