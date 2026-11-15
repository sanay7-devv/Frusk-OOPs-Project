package com.iitsm.web.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /auth/login (API Data Dictionary C.3). */
public record LoginRequest(@NotBlank @Size(max = 150) String email, @NotBlank @Size(max = 200) String password,
                           @Size(max = 10) String totp) {

    /** Without a verification code (accounts that have two-step verification turned on answer MFA_REQUIRED). */
    public LoginRequest(String email, String password) {
        this(email, password, null);
    }
}
