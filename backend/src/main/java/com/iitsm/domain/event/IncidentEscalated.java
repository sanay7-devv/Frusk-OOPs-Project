package com.iitsm.domain.event;

import java.time.Instant;
import java.util.List;

import com.iitsm.domain.escalation.EscalationTarget;
import com.iitsm.domain.priority.Priority;

/**
 * An incident moved up one level of the escalation chain, by the monitor or by hand (handbook 2.6). The audit entry
 * is already written from the incident's own fact; the notification module sends INCIDENT_ESCALATED to
 * {@code recipientIds} (empty when nobody holds the level: it was passed over, DEC-42).
 *
 * @param assigneeId  the technician it was assigned to, or null while in triage (DEC-48)
 * @param recipientIds every active holder of the new level
 * @param manual      true when a person escalated it, false when the monitor did
 * @param actorId     the person who escalated it by hand (not notified about their own action), null for the monitor
 */
public record IncidentEscalated(Long incidentId, String incidentCode, Priority priority, int fromLevel, int toLevel,
                                EscalationTarget target, List<Long> recipientIds, Long assigneeId, boolean manual,
                                Long actorId, Instant occurredAt) implements IncidentEvent {

    public IncidentEscalated {
        recipientIds = List.copyOf(recipientIds);
    }
}
