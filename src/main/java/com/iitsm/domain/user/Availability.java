package com.iitsm.domain.user;

/** Technician availability. Only AVAILABLE and BUSY technicians can receive new work (handbook 1.7). */
public enum Availability {
    AVAILABLE,
    BUSY,
    AWAY,
    OFF_DUTY;

    public boolean acceptsNewWork() {
        return this == AVAILABLE || this == BUSY;
    }
}
