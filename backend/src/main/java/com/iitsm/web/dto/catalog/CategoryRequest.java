package com.iitsm.web.dto.catalog;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Create or update a category (CategoryAdmin, C.9). parentId null = top level; active defaults to true. */
public record CategoryRequest(
        @NotBlank @Size(min = 2, max = 60) String name,
        Long parentId,
        Boolean active,
        List<Long> requiredSkillIds) {
}
