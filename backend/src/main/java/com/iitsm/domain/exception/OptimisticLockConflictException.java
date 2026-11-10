package com.iitsm.domain.exception;

public class OptimisticLockConflictException extends ItsmException {

    public OptimisticLockConflictException() {
        super("OPTIMISTIC_LOCK_CONFLICT", 409, "Someone else changed this incident. Reload and try again.");
    }
}
