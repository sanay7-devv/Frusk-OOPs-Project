package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.user.User;

/** Status ACKNOWLEDGED. */
final class AcknowledgedState extends IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.ACKNOWLEDGED;
    }

    @Override
    public Set<IncidentAction> legalActions(Incident incident, Instant now, Duration reopenWindow) {
        return Set.of(IncidentAction.START_WORK, IncidentAction.REASSIGN);
    }

    @Override
    void startWork(Incident incident, Instant now) {
        incident.moveTo(IncidentStatus.IN_PROGRESS, now);
    }

    /** Hands the incident to another technician; the status does not change. */
    @Override
    void reassign(Incident incident, User technician, Instant now) {
        giveTo(incident, technician);
        incident.moveTo(status(), now);
    }
}
