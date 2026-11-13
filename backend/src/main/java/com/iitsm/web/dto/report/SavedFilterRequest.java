package com.iitsm.web.dto.report;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** POST /saved-filters: a name and the filters exactly as GET /incidents takes them. */
public record SavedFilterRequest(
        @NotBlank @Size(max = 60) String name,
        @NotNull Map<String, Object> filter) {
}
