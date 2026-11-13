package com.iitsm.domain.incident;

import com.iitsm.domain.audit.AuditAction;

/**
 * Something that just happened to an incident, recorded by the {@link Incident} itself the moment it happened
 * (decision DEC-46, C2). The application layer drains these facts after each action and turns every one of them
 * into an audit event, adding the actor and the wording; so an action that changes the incident cannot be saved
 * without its audit entry.
 *
 * @param before the status before the move; null for the creation fact
 * @param after  the status after the move; equal to {@code before} for actions that keep the status
 */
public record IncidentFact(AuditAction action, IncidentStatus before, IncidentStatus after) {
}
