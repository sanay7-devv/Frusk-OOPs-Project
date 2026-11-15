package com.iitsm.web.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** The six digits an authenticator app shows. */
public record MfaCodeRequest(@NotBlank @Pattern(regexp = "\\d{6}", message = "must be 6 digits") String code) {
}
