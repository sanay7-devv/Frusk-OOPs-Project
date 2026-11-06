package com.iitsm.web.dto.catalog;

import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.sla.CalendarType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Create or update an SLA policy (C.9). serviceId null = global default. On update, serviceId and priority must
 * match the existing policy (they identify it). calendarType defaults to ALWAYS.
 */
public record SlaPolicyRequest(
        Long serviceId,
        @NotNull Priority priority,
        @NotNull @Min(1) @Max(10080) Integer responseMinutes,
        @NotNull @Min(1) @Max(43200) Integer resolutionMinutes,
        CalendarType calendarType) {
}
