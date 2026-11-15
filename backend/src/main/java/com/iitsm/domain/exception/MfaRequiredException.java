package com.iitsm.domain.exception;

/**
 * The password was right but the account has two-step verification turned on and no code came with the login
 * (A12). The client asks for the six digits and sends the same login again with the {@code totp} field.
 */
public class MfaRequiredException extends ItsmException {

    public MfaRequiredException() {
        super("MFA_REQUIRED", 401, "A verification code from your authenticator app is required.");
    }
}
