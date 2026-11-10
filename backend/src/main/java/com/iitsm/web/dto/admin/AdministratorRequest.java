package com.iitsm.web.dto.admin;

import com.iitsm.domain.user.AdminScope;

import jakarta.validation.constraints.NotNull;

/** Administrator profile: SYSTEM_ADMIN or IT_MANAGER. */
public record AdministratorRequest(
        @NotNull AdminScope scope) {
}
