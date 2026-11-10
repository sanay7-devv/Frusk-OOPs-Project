package com.iitsm.domain.exception;

public class SlaNotConfiguredException extends ItsmException {

    public SlaNotConfiguredException(Object service, String priority) {
        super("SLA_NOT_CONFIGURED", 422, "No SLA policy for service " + service + " and priority " + priority + ".");
    }
}
