package com.iitsm.domain.event;

import java.time.Instant;

import com.iitsm.domain.priority.Priority;

/**
 * A new incident could not be assigned (no category, or nobody eligible) and waits in the triage queue for a team
 * lead (handbook 1.7). For the notification listener; the creation itself is already in the audit trail.
 */
public record TriageNeeded(Long incidentId, String incidentCode, Priority priority, String reason,
                           Instant occurredAt) implements IncidentEvent {
}
