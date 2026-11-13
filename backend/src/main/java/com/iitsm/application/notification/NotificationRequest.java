package com.iitsm.application.notification;

import java.util.Map;

import com.iitsm.domain.notification.Audience;
import com.iitsm.domain.notification.NotificationEventType;
import com.iitsm.domain.priority.Priority;

/**
 * One notification to send, decided but not yet worded or delivered: who, why, how urgent. Plain data built inside
 * the planner's transaction, so the delivery that follows needs no database session and no lazy entity.
 *
 * @param recipient  the person, or null for the chat room
 * @param critical   true when the alert cannot be switched off for this person (decision DEC-40)
 * @param incidentId null only for a digest
 * @param values     the placeholders of the template ({code}, {title}, ...)
 */
public record NotificationRequest(Person recipient, Audience audience, NotificationEventType type, boolean critical,
                                  Priority priority, Long incidentId, String incidentCode,
                                  Map<String, String> values) {

    /** A person as the delivery needs them. */
    public record Person(Long id, String name, String email) {
    }

    public NotificationRequest {
        values = Map.copyOf(values);
    }
}
