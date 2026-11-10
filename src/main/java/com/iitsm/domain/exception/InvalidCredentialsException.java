package com.iitsm.domain.exception;

public class InvalidCredentialsException extends ItsmException {

    public InvalidCredentialsException() {
        super("INVALID_CREDENTIALS", 401, "Email or password is incorrect.");
    }
}
