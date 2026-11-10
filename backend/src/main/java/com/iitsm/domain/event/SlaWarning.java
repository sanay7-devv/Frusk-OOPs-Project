package com.iitsm.domain.event;

import java.time.Instant;

import com.iitsm.domain.incident.SlaClockType;
import com.iitsm.domain.priority.Priority;

/**
 * An SLA clock reached a warning threshold (first or second warning, handbook 1.7). Published by the SLA monitor.
 *
 * @param warning     1 for the first warning, 2 for the second
 * @param assigneeId  the technician to warn, or null if nobody is assigned
 */
public record SlaWarning(Long incidentId, String incidentCode, Priority priority, SlaClockType clock, int warning,
                         int percent, Instant due, Long assigneeId, Instant occurredAt) implements IncidentEvent {
}
