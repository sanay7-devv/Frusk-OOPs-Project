package com.iitsm.web.dto.incident;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body with a reason, for example POST /incidents/{id}/reopen. */
public record ReasonRequest(
        @NotBlank @Size(min = 10, max = 1000) String reason) {
}
