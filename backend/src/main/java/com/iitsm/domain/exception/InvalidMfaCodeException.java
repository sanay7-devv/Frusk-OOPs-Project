package com.iitsm.domain.exception;

/**
 * The password was right but the verification code was wrong, expired or already used (A12). Counted as a failed
 * login, so guessing codes locks the account like guessing passwords does.
 */
public class InvalidMfaCodeException extends ItsmException {

    public InvalidMfaCodeException() {
        super("INVALID_MFA_CODE", 401, "The verification code is wrong, expired or already used.");
    }
}
