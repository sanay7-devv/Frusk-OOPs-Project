package com.iitsm.domain.notification;

import java.time.Instant;

import com.iitsm.domain.priority.Priority;

/**
 * What a channel delivers: the words, the person and the incident. Immutable; the in-app channel runs first and
 * the dispatcher hands the id of the stored inbox row to the channels after it ({@link #withInboxId}), so a pushed
 * notification can be marked read through the API.
 *
 * @param recipientId    the person, or null for a chat room message
 * @param recipientEmail where the mail goes (null for a room)
 * @param incidentId     the incident this is about, or null for a digest of several
 * @param priority       the incident's priority, or null for a digest
 * @param inboxId        id of the stored inbox row, null until the in-app channel has run
 */
public record NotificationMessage(Long recipientId, String recipientName, String recipientEmail,
                                  NotificationEventType eventType, Audience audience, String title,
                                  String message, Long incidentId, String incidentCode, Priority priority,
                                  Instant createdAt, Long inboxId) {

    public NotificationMessage withInboxId(Long id) {
        return new NotificationMessage(recipientId, recipientName, recipientEmail, eventType, audience, title,
                message, incidentId, incidentCode, priority, createdAt, id);
    }
}
