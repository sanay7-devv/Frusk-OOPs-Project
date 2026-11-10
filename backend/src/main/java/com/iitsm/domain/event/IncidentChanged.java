package com.iitsm.domain.event;

import java.time.Instant;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.incident.IncidentStatus;

/**
 * Something a person or the system did to an incident: created, classified, prioritized, assigned, acknowledged,
 * resolved, commented and so on (handbook 2.6). One record type carries every lifecycle change; {@code action}
 * says which one (decision DEC-38).
 *
 * @param actorId       who did it, or null for the system
 * @param previousState status before; equal to {@code newState} for actions that keep the status
 * @param description   one human-readable line for the audit trail
 */
public record IncidentChanged(Long incidentId, String incidentCode, AuditAction action, Long actorId,
                              IncidentStatus previousState, IncidentStatus newState, String description,
                              Instant occurredAt) implements IncidentEvent {
}
