package com.iitsm.web.dto.report;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** POST /incidents/{id}/feedback (API Data Dictionary C.4). */
public record FeedbackRequest(
        @NotNull @Min(1) @Max(5) Integer rating,
        @Size(max = 1000) String comment) {
}
