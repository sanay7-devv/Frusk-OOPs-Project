package com.iitsm.web.dto.incident;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /incidents/{id}/provide-info: the reporter's answer. */
public record ProvideInfoRequest(
        @NotBlank @Size(min = 1, max = 2000) String message) {
}
