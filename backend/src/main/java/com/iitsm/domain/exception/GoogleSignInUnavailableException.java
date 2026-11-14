package com.iitsm.domain.exception;

/** Google's signing keys could not be fetched, so no Google ID token can be checked right now (M2b, DEC-103). */
public class GoogleSignInUnavailableException extends ItsmException {

    public GoogleSignInUnavailableException() {
        super("SERVICE_UNAVAILABLE", 503, "Google sign-in is unavailable right now. Try again or use your password.");
    }
}
