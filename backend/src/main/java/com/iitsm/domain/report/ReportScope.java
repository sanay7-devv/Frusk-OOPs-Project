package com.iitsm.domain.report;

import java.time.Instant;

/**
 * Which incidents a report counts: the same visibility rule as the incident list (a null user means every incident)
 * and an optional creation time range [from, to). Reports never choose their own scope; the application layer sets
 * it from the caller's role.
 */
public record ReportScope(Long visibleToUserId, Instant from, Instant to) {

    public ReportScope withRange(Instant newFrom, Instant newTo) {
        return new ReportScope(visibleToUserId, newFrom, newTo);
    }
}
