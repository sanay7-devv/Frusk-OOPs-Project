package com.iitsm.domain.exception;

public class AccountLockedException extends ItsmException {

    public AccountLockedException() {
        super("ACCOUNT_LOCKED", 423, "Too many attempts. Try again in 15 minutes.");
    }
}
