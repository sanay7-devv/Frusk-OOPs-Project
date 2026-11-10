package com.iitsm.domain.exception;

public class UnauthorizedOperationException extends ItsmException {

    public UnauthorizedOperationException(String detail) {
        super("UNAUTHORIZED_OPERATION", 403, detail);
    }
}
