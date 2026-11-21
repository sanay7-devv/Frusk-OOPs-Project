package com.iitsm.domain.exception;

public class WorkloadExceededException extends ItsmException {

    /** @param self true when the technician is the person asking (a lead taking over): "You are at full capacity" */
    public WorkloadExceededException(String technicianName, int load, int max, boolean self) {
        super("WORKLOAD_EXCEEDED", 409, (self ? "You are" : technicianName + " is") + " at full capacity ("
                + load + "/" + max + ").");
    }

    public WorkloadExceededException(String technicianName) {
        super("WORKLOAD_EXCEEDED", 409, technicianName + " has reached the maximum workload.");
    }
}
