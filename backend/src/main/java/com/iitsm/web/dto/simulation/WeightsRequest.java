package com.iitsm.web.dto.simulation;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

/** The five composite assignment weights to try; any left out keeps its current value. All five must add up to 1.0. */
public record WeightsRequest(
        @DecimalMin("0") @DecimalMax("1") Double skill,
        @DecimalMin("0") @DecimalMax("1") Double load,
        @DecimalMin("0") @DecimalMax("1") Double experience,
        @DecimalMin("0") @DecimalMax("1") Double priorityFit,
        @DecimalMin("0") @DecimalMax("1") Double familiarity) {
}
