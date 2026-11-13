package com.iitsm.web.dto.report;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * POST /priority/what-if. With incidentId the service and category come from that incident; without it serviceId
 * is required and categoryId is optional.
 */
public record PriorityWhatIfRequest(
        Long incidentId,
        Long serviceId,
        Long categoryId,
        @NotNull @Min(1) @Max(5) Integer impact,
        @NotNull @Min(1) @Max(5) Integer urgency,
        @NotNull @Min(1) @Max(1000000) Integer affectedUsers) {
}
