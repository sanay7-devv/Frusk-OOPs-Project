package com.iitsm.web.dto.catalog;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Create or update a service (ServiceAdmin, API Data Dictionary C.9). active defaults to true. */
public record ServiceRequest(
        @NotBlank @Size(min = 2, max = 80) String name,
        @Size(max = 80) String owner,
        @NotNull @Min(1) @Max(5) Integer criticality,
        boolean alwaysP1,
        @Size(max = 1000) String description,
        Boolean active,
        List<Long> dependencyIds) {
}
