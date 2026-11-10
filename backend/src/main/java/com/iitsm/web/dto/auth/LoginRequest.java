package com.iitsm.web.dto.auth;

import jakarta.validation.constraints.NotBlank;

/** POST /auth/login (API Data Dictionary C.3). */
public record LoginRequest(@NotBlank String email, @NotBlank String password) {
}
