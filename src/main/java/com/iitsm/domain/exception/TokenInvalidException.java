package com.iitsm.domain.exception;

public class TokenInvalidException extends ItsmException {

    public TokenInvalidException() {
        super("TOKEN_INVALID", 401, "Token is invalid. Log in again.");
    }
}
