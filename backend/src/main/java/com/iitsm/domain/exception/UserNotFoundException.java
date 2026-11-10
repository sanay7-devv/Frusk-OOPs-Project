package com.iitsm.domain.exception;

public class UserNotFoundException extends ItsmException {

    public UserNotFoundException(Object idOrEmail) {
        super("USER_NOT_FOUND", 404, "User not found: " + idOrEmail);
    }
}
