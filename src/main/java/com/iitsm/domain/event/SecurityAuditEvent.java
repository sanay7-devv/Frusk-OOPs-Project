package com.iitsm.domain.event;

import java.time.Instant;

import com.iitsm.domain.audit.AuditAction;

/**
 * An audited action that is not about one incident: a failed login, a refused request, a role change, a
 * configuration change (handbook Appendix A.4). Recorded even when the request itself fails.
 *
 * @param actorId who did it (null for an unknown account or the system)
 */
public record SecurityAuditEvent(AuditAction action, Long actorId, String description, Instant occurredAt) {
}
