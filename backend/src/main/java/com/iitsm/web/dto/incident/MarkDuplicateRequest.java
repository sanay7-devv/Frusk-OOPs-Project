package com.iitsm.web.dto.incident;

import jakarta.validation.constraints.NotNull;

/** Body of POST /incidents/{id}/mark-duplicate (API Data Dictionary C.4): an existing, different incident. */
public record MarkDuplicateRequest(@NotNull Long duplicateOfId) {
}
