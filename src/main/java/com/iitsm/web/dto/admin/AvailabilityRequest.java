package com.iitsm.web.dto.admin;

import com.iitsm.domain.user.Availability;

import jakarta.validation.constraints.NotNull;

/** PUT /technicians/me/availability (addition to the contract). */
public record AvailabilityRequest(
        @NotNull Availability availability) {
}
