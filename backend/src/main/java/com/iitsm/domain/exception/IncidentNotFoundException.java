package com.iitsm.domain.exception;

public class IncidentNotFoundException extends ItsmException {

    public IncidentNotFoundException(Object idOrCode) {
        super("INCIDENT_NOT_FOUND", 404, "Incident not found: " + idOrCode);
    }
}
