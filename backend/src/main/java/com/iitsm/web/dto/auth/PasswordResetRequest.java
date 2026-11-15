package com.iitsm.web.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /auth/password-reset/request: the answer is 202 whether or not the e-mail has an account. */
public record PasswordResetRequest(@NotBlank @Size(max = 150) String email) {
}
