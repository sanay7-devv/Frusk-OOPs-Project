package com.iitsm.web.dto.incident;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /incidents/{id}/request-info: the question for the reporter. */
public record RequestInfoRequest(
        @NotBlank @Size(min = 10, max = 2000) String message) {
}
