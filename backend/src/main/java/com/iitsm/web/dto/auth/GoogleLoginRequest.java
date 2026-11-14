package com.iitsm.web.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * Request body for Google Sign-In containing the Google OAuth2 ID Token (JWT).
 */
public record GoogleLoginRequest(
        @NotBlank(message = "idToken must not be blank")
        @Schema(description = "Raw Google ID Token returned by Google Identity Services", required = true)
        String idToken
) {
}

