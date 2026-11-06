package com.iitsm.web.dto.incident;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** POST /incidents/{id}/resolve (C.4 limits). */
public record ResolveRequest(
        @NotBlank @Size(min = 10, max = 2000) String rootCause,
        @NotBlank @Size(min = 10, max = 4000) String notes,
        @Size(max = 4000) String steps,
        @NotNull @Min(1) @Max(10080) Integer timeSpentMinutes,
        boolean reusableSolution) {
}
