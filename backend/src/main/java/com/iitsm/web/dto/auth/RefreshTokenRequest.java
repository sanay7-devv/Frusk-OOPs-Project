package com.iitsm.web.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of POST /auth/refresh and POST /auth/logout (RefreshRequest / LogoutRequest in C.3, same shape). */
public record RefreshTokenRequest(@NotBlank @Size(max = 200) String refreshToken) {
}
