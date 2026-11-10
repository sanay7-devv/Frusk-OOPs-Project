package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.user.User;

/** Status ASSIGNED. */
final class AssignedState extends IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.ASSIGNED;
    }

    @Override
    public Set<IncidentAction> legalActions(Incident incident, Instant now, Duration reopenWindow) {
        return Set.of(IncidentAction.ACKNOWLEDGE, IncidentAction.REASSIGN);
    }

    /** Stops the response clock. */
    @Override
    void acknowledge(Incident incident, Instant now) {
        incident.markAcknowledged(now);
        incident.moveTo(IncidentStatus.ACKNOWLEDGED, now);
    }

    /** Hands the incident to another technician; the status does not change. */
    @Override
    void reassign(Incident incident, User technician, Instant now) {
        giveTo(incident, technician);
        incident.moveTo(status(), now);
    }
}
