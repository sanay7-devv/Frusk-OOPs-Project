package com.iitsm.web.dto.catalog;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** PUT /admin/services/{id}/dependencies: the full new list (empty list = no dependencies). */
public record DependenciesRequest(@NotNull @Size(max = 200) List<Long> dependencyIds) {
}
