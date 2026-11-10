package com.iitsm.web.dto.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Create or rename a skill (C.9). */
public record SkillRequest(@NotBlank @Size(min = 2, max = 60) String name) {
}
