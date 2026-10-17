package com.iitsm.domain.exception;

public class ConflictOfInterestException extends ItsmException {

    public ConflictOfInterestException() {
        super("CONFLICT_OF_INTEREST", 403, "You reported this incident, so you cannot handle it.");
    }
}
