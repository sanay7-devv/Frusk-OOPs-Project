package com.iitsm.domain.exception;

public class InvalidStateTransitionException extends ItsmException {

    public InvalidStateTransitionException(String currentState, String action) {
        super("INVALID_STATE_TRANSITION", 409,
                "Action " + action + " is not allowed in status " + currentState);
    }
}
