package com.iitsm.web.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /auth/password-reset/confirm: the secret from the mailed link and the new password. */
public record PasswordResetConfirmRequest(@NotBlank @Size(max = 200) String token,
                                          @NotBlank @Size(max = 200) String newPassword) {
}
