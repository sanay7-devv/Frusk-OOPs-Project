package com.iitsm.domain.incident;

import java.util.EnumSet;
import java.util.Set;

/** The ten lifecycle states (handbook 1.8). The behavior of each lives in its {@link IncidentState} class. */
public enum IncidentStatus {
    NEW,
    CLASSIFIED,
    ASSIGNED,
    ACKNOWLEDGED,
    IN_PROGRESS,
    PENDING_USER_INFO,
    RESOLVED,
    VERIFIED,
    CLOSED,
    REOPENED;

    /** States that count toward a technician's workload. */
    public static final Set<IncidentStatus> ACTIVE_WORK =
            EnumSet.of(ASSIGNED, ACKNOWLEDGED, IN_PROGRESS, PENDING_USER_INFO, REOPENED);

    /** States in which at least one SLA clock can still be running (everything before RESOLVED). */
    public static final Set<IncidentStatus> OPEN =
            EnumSet.of(NEW, CLASSIFIED, ASSIGNED, ACKNOWLEDGED, IN_PROGRESS, PENDING_USER_INFO, REOPENED);

    /** From RESOLVED on, the incident's details can no longer be edited (API Data Dictionary C.4). */
    public boolean isEditable() {
        return this != RESOLVED && this != VERIFIED && this != CLOSED;
    }

    /** RESOLVED, VERIFIED and CLOSED: the work is done (the resolution clock has stopped). */
    public boolean isResolvedOrLater() {
        return this == RESOLVED || this == VERIFIED || this == CLOSED;
    }
}
