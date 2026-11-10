package com.iitsm.web.dto.admin;

import com.iitsm.domain.user.Availability;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** PUT /admin/technicians/{id} (addition to the contract): change the technician profile; send only what changes. */
public record UpdateTechnicianRequest(
        @Min(1) @Max(5) Integer experienceLevel,
        @Min(0) @Max(1) Integer escalationLevel,
        @Min(1) @Max(50) Integer maxLoad,
        Availability availability) {
}
