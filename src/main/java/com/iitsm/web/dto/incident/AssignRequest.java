package com.iitsm.web.dto.incident;


/** POST /incidents/{id}/assign. technicianId will become optional with automatic assignment (M6). */
public record AssignRequest(
        Long technicianId) {
}
