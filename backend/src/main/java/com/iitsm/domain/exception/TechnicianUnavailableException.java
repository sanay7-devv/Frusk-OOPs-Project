package com.iitsm.domain.exception;

public class TechnicianUnavailableException extends ItsmException {

    public TechnicianUnavailableException(String technicianName) {
        super("TECHNICIAN_UNAVAILABLE", 409, technicianName + " is not available for new work.");
    }

    /** @param reason why, for example "is AWAY" or "has none of the skills this category needs" */
    public TechnicianUnavailableException(String technicianName, String reason) {
        super("TECHNICIAN_UNAVAILABLE", 409, technicianName + " cannot take this incident: " + reason + ".");
    }

    /** Automatic assignment was asked for and the only thing missing is free capacity. */
    public static TechnicianUnavailableException noFreeCapacity() {
        return new TechnicianUnavailableException(
                "No technician has free capacity right now. Wait for someone to finish work, or raise a maximum load.",
                true);
    }

    private TechnicianUnavailableException(String message, boolean fullMessage) {
        super("TECHNICIAN_UNAVAILABLE", 409, message);
    }

    /** Automatic assignment was asked for but every technician is excluded. */
    public static TechnicianUnavailableException noneEligible() {
        return new TechnicianUnavailableException(
                "No technician is eligible for this incident right now (see the recommendations for why).", true);
    }
}
