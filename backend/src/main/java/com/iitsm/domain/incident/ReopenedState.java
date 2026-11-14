package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

/** Status REOPENED. */
final class ReopenedState extends OpenState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.REOPENED;
    }

    @Override
    Set<IncidentAction> ownActions(Incident incident, Instant now, Duration reopenWindow) {
        return Set.of(IncidentAction.START_WORK);
    }

    /** The assigned technician picks the reopened incident up again. */
    @Override
    void startWork(Incident incident, Instant now) {
        incident.moveTo(IncidentStatus.IN_PROGRESS, now);
    }
}
