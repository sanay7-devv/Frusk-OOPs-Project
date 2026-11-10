package com.iitsm.domain.exception;

public class InvalidStateTransitionException extends ItsmException {

    public InvalidStateTransitionException(String currentState, String action) {
        super("INVALID_STATE_TRANSITION", 409,
                "Action " + action + " is not allowed in status " + currentState);
    }

    /** The action exists in this status but a rule blocks it, for example the 7-day reopen window. */
    public InvalidStateTransitionException(String currentState, String action, String reason) {
        super("INVALID_STATE_TRANSITION", 409,
                "Action " + action + " is not allowed in status " + currentState + ": " + reason);
    }
}
