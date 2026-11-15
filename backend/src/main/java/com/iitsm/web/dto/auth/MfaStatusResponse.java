package com.iitsm.web.dto.auth;

/** GET /auth/mfa: whether two-step verification is turned on for the caller. */
public record MfaStatusResponse(boolean enabled) {
}
