package com.iitsm.domain.exception;

/**
 * A catalog item without its own contract code is missing (category, skill, SLA or escalation policy).
 * Uses the generic NOT_FOUND code from decision D-005; services, users and incidents keep their specific codes.
 */
public class ResourceNotFoundException extends ItsmException {

    public ResourceNotFoundException(String resource, Object id) {
        super("NOT_FOUND", 404, resource + " not found: " + id);
    }
}
