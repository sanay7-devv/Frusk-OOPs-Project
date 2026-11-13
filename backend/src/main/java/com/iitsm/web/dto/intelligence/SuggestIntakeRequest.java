package com.iitsm.web.dto.intelligence;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /intelligence/suggest-intake (API Data Dictionary C.6). */
public record SuggestIntakeRequest(@NotBlank @Size(max = 5000) String description) {
}
