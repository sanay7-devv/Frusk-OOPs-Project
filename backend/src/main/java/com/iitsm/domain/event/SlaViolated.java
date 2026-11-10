package com.iitsm.domain.event;

import java.time.Instant;

import com.iitsm.domain.incident.SlaClockType;
import com.iitsm.domain.priority.Priority;

/** An SLA deadline passed; the violation is already recorded in sla_violations. Published by the SLA monitor. */
public record SlaViolated(Long incidentId, String incidentCode, Priority priority, SlaClockType clock,
                          long overdueSeconds, Long violationId, Long assigneeId, Instant occurredAt)
        implements IncidentEvent {
}
