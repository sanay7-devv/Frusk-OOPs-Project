package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.user.User;

/** Status ASSIGNED. */
final class AssignedState extends OpenState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.ASSIGNED;
    }

    @Override
    Set<IncidentAction> ownActions(Incident incident, Instant now, Duration reopenWindow) {
        return withEscalate(incident, IncidentAction.ACKNOWLEDGE, IncidentAction.REASSIGN, IncidentAction.WITHDRAW);
    }

    @Override
    void escalate(Incident incident, Instant now) {
        raiseLevel(incident, now);
    }

    /** ASSIGNED and not acknowledged: the escalation monitor watches it. */
    @Override
    boolean isUnattended(Incident incident) {
        return true;
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

    /** The reporter withdraws the report before work starts (G3). */
    @Override
    void withdraw(Incident incident, String reason, Instant now) {
        withdrawBeforeWork(incident, reason, now);
    }
}
