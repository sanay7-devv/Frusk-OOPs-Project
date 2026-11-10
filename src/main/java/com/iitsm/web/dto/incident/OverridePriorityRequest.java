package com.iitsm.web.dto.incident;

import com.iitsm.domain.priority.Priority;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** POST /incidents/{id}/override-priority. */
public record OverridePriorityRequest(
        @NotNull Priority priority,
        @NotBlank @Size(min = 10, max = 1000) String reason) {
}
