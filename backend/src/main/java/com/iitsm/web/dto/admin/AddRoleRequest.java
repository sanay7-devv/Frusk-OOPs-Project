package com.iitsm.web.dto.admin;

import com.iitsm.domain.user.RoleType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/** POST /admin/users/{id}/roles: the role plus its profile (technician or administrator object). */
public record AddRoleRequest(
        @NotNull RoleType roleType,
        @Valid TechnicianRequest technician,
        @Valid AdministratorRequest administrator) {
}
