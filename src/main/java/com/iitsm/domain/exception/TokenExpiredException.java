package com.iitsm.domain.exception;

public class TokenExpiredException extends ItsmException {

    public TokenExpiredException() {
        super("TOKEN_EXPIRED", 401, "Access token expired. Refresh or log in again.");
    }
}
