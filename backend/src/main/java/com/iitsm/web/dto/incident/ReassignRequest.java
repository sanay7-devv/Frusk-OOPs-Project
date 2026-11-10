package com.iitsm.web.dto.incident;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** POST /incidents/{id}/reassign. */
public record ReassignRequest(
        @NotNull Long technicianId,
        @NotBlank @Size(min = 10, max = 1000) String reason) {
}
