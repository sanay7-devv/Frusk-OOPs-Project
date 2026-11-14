package com.iitsm.web.dto.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;

/** One item of the PUT /admin/config body (a list of key and value). */
public record ConfigValueRequest(@NotBlank @Size(max = 100) String key, @NotNull @Size(max = 2000) String value) {
}
