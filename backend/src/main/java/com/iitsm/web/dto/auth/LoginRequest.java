package com.iitsm.web.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /auth/login (API Data Dictionary C.3). */
public record LoginRequest(@NotBlank @Size(max = 150) String email, @NotBlank @Size(max = 200) String password) {
}
