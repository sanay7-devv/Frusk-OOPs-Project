package com.iitsm.domain.exception;

public class TechnicianUnavailableException extends ItsmException {

    public TechnicianUnavailableException(String technicianName) {
        super("TECHNICIAN_UNAVAILABLE", 409, technicianName + " is not available for new work.");
    }

    /** @param reason why, for example "is AWAY" or "has none of the skills this category needs" */
    public TechnicianUnavailableException(String technicianName, String reason) {
        super("TECHNICIAN_UNAVAILABLE", 409, technicianName + " cannot take this incident: " + reason + ".");
    }
}
