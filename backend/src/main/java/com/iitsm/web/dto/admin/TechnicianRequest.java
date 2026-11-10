package com.iitsm.web.dto.admin;

import java.util.List;

import com.iitsm.domain.user.Availability;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Technician profile (C.9). escalationLevel 1 makes a team lead; maxLoad defaults to 10, availability to AVAILABLE. */
public record TechnicianRequest(
        @NotNull @Min(1) @Max(5) Integer experienceLevel,
        @NotNull @Min(0) @Max(1) Integer escalationLevel,
        @Min(1) @Max(50) Integer maxLoad,
        Availability availability,
        List<@Valid SkillLevelRequest> skills) {
}
