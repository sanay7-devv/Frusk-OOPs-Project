package com.iitsm.web.dto.intelligence;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** POST /intelligence/similar (API Data Dictionary C.6): a draft report and the service it is about. */
public record SimilarRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 5000) String description,
        @NotNull Long serviceId) {
}
