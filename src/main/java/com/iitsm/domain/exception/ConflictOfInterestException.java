package com.iitsm.domain.exception;

public class ConflictOfInterestException extends ItsmException {

    public ConflictOfInterestException() {
        super("CONFLICT_OF_INTEREST", 403, "You reported this incident, so you cannot handle it.");
    }

    /** When someone else (an admin or team lead) tries to give the incident to its own reporter. */
    public ConflictOfInterestException(String technicianName) {
        super("CONFLICT_OF_INTEREST", 403, technicianName + " reported this incident, so they cannot handle it.");
    }
}
