package com.iitsm.web.dto.catalog;

import java.util.List;

import jakarta.validation.constraints.NotNull;

/** PUT /admin/services/{id}/dependencies: the full new list (empty list = no dependencies). */
public record DependenciesRequest(@NotNull List<Long> dependencyIds) {
}
