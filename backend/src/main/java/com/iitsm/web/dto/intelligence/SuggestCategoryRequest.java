package com.iitsm.web.dto.intelligence;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /intelligence/suggest-category (API Data Dictionary C.6). Looser limits than a report: it is used while typing. */
public record SuggestCategoryRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 5000) String description,
        Long serviceId) {
}
