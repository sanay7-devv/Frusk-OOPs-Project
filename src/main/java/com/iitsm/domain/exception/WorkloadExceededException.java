package com.iitsm.domain.exception;

public class WorkloadExceededException extends ItsmException {

    public WorkloadExceededException(String technicianName) {
        super("WORKLOAD_EXCEEDED", 409, technicianName + " has reached the maximum workload.");
    }
}
