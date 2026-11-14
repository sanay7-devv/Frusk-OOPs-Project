package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.user.User;

/** Status ACKNOWLEDGED. */
final class AcknowledgedState extends OpenState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.ACKNOWLEDGED;
    }

    @Override
    Set<IncidentAction> ownActions(Incident incident, Instant now, Duration reopenWindow) {
        return withEscalate(incident, IncidentAction.START_WORK, IncidentAction.REASSIGN,
                IncidentAction.WITHDRAW);
    }

    @Override
    void escalate(Incident incident, Instant now) {
        raiseLevel(incident, now);
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

    /** The reporter withdraws the report before work starts (G3). */
    @Override
    void withdraw(Incident incident, String reason, Instant now) {
        withdrawBeforeWork(incident, reason, now);
    }
}
