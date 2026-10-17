package com.iitsm.domain.exception;

public class TechnicianUnavailableException extends ItsmException {

    public TechnicianUnavailableException(String technicianName) {
        super("TECHNICIAN_UNAVAILABLE", 409, technicianName + " is not available for new work.");
    }
}
