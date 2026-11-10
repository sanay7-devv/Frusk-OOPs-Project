package com.iitsm.web.dto.auth;

import jakarta.validation.constraints.NotBlank;

/** Body of POST /auth/refresh and POST /auth/logout (RefreshRequest / LogoutRequest in C.3, same shape). */
public record RefreshTokenRequest(@NotBlank String refreshToken) {
}
