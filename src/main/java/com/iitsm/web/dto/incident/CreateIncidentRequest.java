package com.iitsm.web.dto.incident;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** POST /incidents (API Data Dictionary C.4). categoryId is optional: without it the incident waits in triage. */
public record CreateIncidentRequest(
        @NotBlank @Size(min = 5, max = 200) String title,
        @NotBlank @Size(min = 20, max = 5000) String description,
        @NotNull Long serviceId,
        Long categoryId,
        @NotNull @Min(1) @Max(5) Integer impact,
        @NotNull @Min(1) @Max(5) Integer urgency,
        @NotNull @Min(1) @Max(1000000) Integer affectedUsers,
        Boolean confirmNotDuplicate) {
}
