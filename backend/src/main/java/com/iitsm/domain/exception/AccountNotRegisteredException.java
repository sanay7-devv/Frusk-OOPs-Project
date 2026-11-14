package com.iitsm.domain.exception;

public class AccountNotRegisteredException extends ItsmException {

    public AccountNotRegisteredException(String email) {
        super("ACCOUNT_NOT_REGISTERED", 404, "No account registered with email " + email + ". Please register first or contact your administrator.");
    }
}

