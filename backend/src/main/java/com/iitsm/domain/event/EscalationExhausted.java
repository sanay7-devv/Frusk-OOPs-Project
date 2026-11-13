package com.iitsm.domain.event;

import java.time.Instant;
import java.util.List;

import com.iitsm.domain.priority.Priority;

/**
 * The chain ran out: a P1 or P2 is still unacknowledged after level 3 (DEC-49). Raised once per incident. The
 * notification module sends INCIDENT_ESCALATED, worded as an exhausted alert, to every administrator in
 * {@code recipientIds} (SMS as well for P1). The audit entry is already written from the incident's own fact.
 */
public record EscalationExhausted(Long incidentId, String incidentCode, Priority priority, List<Long> recipientIds,
                                  Instant occurredAt) implements IncidentEvent {

    public EscalationExhausted {
        recipientIds = List.copyOf(recipientIds);
    }
}
