package com.iitsm.web.dto.simulation;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * A simulation to run.
 *
 * @param lastIncidents how many of the most recent incidents to replay (10 to 500, default 100)
 * @param speedUp       compress the real arrival times by this factor to simulate an outage storm (1 to 20, default 1)
 * @param configurations up to three configurations to compare; empty means "the current settings" alone
 */
public record SimulationRequest(
        @Min(10) @Max(500) Integer lastIncidents,
        @DecimalMin("1") @DecimalMax("20") Double speedUp,
        @Size(max = 3) List<@Valid ConfigurationRequest> configurations) {
}
