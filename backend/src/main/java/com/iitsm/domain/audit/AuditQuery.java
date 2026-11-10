package com.iitsm.domain.audit;

import java.time.Instant;

/** Filters of GET /audit (contract B.4); every filter is optional (null). Time range is [from, to). */
public record AuditQuery(Long incidentId, Long actorId, AuditAction action, Instant from, Instant to, int page,
                         int size) {
}
