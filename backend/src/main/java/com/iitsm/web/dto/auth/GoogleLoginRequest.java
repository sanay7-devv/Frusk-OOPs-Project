package com.iitsm.web.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /auth/google (DEC-04): the ID token the Google Sign-In button hands the frontend. */
public record GoogleLoginRequest(@NotBlank @Size(max = 4096) String idToken) {
}
