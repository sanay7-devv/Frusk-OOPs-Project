package com.iitsm.web.dto.auth;

import com.iitsm.application.auth.AuthService.AuthResult;

/** AuthResponse (API Data Dictionary C.3), returned by register, login and refresh. */
public record AuthResponse(String accessToken, String refreshToken, long expiresInSeconds, CurrentUserResponse user) {

    public static AuthResponse from(AuthResult result) {
        return new AuthResponse(result.accessToken(), result.refreshToken(), result.expiresInSeconds(),
                CurrentUserResponse.from(result.user()));
    }
}
