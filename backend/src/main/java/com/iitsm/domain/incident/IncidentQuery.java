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
 */
public record IncidentQuery(Long visibleToUserId, List<IncidentStatus> statuses, List<Priority> priorities,
                            Long categoryId, Long serviceId, Long assigneeId, Long reporterId, String code,
                            String text, Instant createdFrom, Instant createdTo, int page, int size,
                            String sortField, boolean ascending) {

    public IncidentQuery {
        statuses = statuses == null ? List.of() : List.copyOf(statuses);
        priorities = priorities == null ? List.of() : List.copyOf(priorities);
    }
}
