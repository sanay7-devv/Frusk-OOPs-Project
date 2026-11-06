package com.iitsm.web.dto.admin;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** One skill of a technician with a proficiency from 1 to 5. */
public record SkillLevelRequest(
        @NotNull Long skillId,
        @NotNull @Min(1) @Max(5) Integer proficiency) {
}
