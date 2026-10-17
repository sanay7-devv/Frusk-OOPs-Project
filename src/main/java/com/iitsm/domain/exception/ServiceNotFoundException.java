package com.iitsm.domain.exception;

public class ServiceNotFoundException extends ItsmException {

    public ServiceNotFoundException(Object idOrName) {
        super("SERVICE_NOT_FOUND", 404, "Service not found: " + idOrName);
    }
}
