package com.iitsm.domain.exception;

public class AccountLockedException extends ItsmException {

    /** @param lockMinutes the configured lock length (app_config security.lockout.minutes) */
    public AccountLockedException(int lockMinutes) {
        super("ACCOUNT_LOCKED", 423, "Too many attempts. Try again in " + lockMinutes + " minutes.");
    }
}
