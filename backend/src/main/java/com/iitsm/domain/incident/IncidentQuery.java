package com.iitsm.domain.incident;

import java.time.Instant;
import java.util.List;

import com.iitsm.domain.priority.Priority;

/**
 * Search criteria for the incident list (API contract B.4 GET /incidents). Null or empty means "any".
 *
 * @param visibleToUserId if set, only incidents this user reported or is assigned to (role-based visibility,
 *                        applied by the application layer, never chosen by the client)
 * @param text            free text matched against code, title and description
 * @param sortField       one of createdAt, priority, status, code, resolutionDue
 * @param slaState        filter on the SLA state as far as the stored flags and the status can tell (decision
 *                        DEC-42); null = any. May lag the detail view by one SLA monitor interval.
 */
public record IncidentQuery(Long visibleToUserId, List<IncidentStatus> statuses, List<Priority> priorities,
                            Long categoryId, Long serviceId, Long assigneeId, Long reporterId, String code,
                            String text, Instant createdFrom, Instant createdTo, int page, int size,
                            String sortField, boolean ascending, SlaState slaState) {

    public IncidentQuery {
        statuses = statuses == null ? List.of() : List.copyOf(statuses);
        priorities = priorities == null ? List.of() : List.copyOf(priorities);
    }

    /** Without an SLA state filter (the shape every caller used before module M10). */
    public IncidentQuery(Long visibleToUserId, List<IncidentStatus> statuses, List<Priority> priorities,
                         Long categoryId, Long serviceId, Long assigneeId, Long reporterId, String code,
                         String text, Instant createdFrom, Instant createdTo, int page, int size,
                         String sortField, boolean ascending) {
        this(visibleToUserId, statuses, priorities, categoryId, serviceId, assigneeId, reporterId, code, text,
                createdFrom, createdTo, page, size, sortField, ascending, null);
    }

    /** The same query restricted to one user's own and assigned incidents. */
    public IncidentQuery visibleTo(Long userId) {
        return new IncidentQuery(userId, statuses, priorities, categoryId, serviceId, assigneeId, reporterId, code,
                text, createdFrom, createdTo, page, size, sortField, ascending, slaState);
    }

    /** The same query for another page and size (used by the CSV export to walk through the result). */
    public IncidentQuery withPage(int newPage, int newSize) {
        return new IncidentQuery(visibleToUserId, statuses, priorities, categoryId, serviceId, assigneeId,
                reporterId, code, text, createdFrom, createdTo, newPage, newSize, sortField, ascending, slaState);
    }
}
