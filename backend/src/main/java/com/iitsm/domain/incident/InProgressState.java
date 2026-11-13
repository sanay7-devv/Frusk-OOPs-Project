package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.user.User;

/** Status IN_PROGRESS. */
final class InProgressState extends IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.IN_PROGRESS;
    }

    @Override
    public Set<IncidentAction> legalActions(Incident incident, Instant now, Duration reopenWindow) {
        return withEscalate(incident, IncidentAction.REQUEST_INFO, IncidentAction.RESOLVE, IncidentAction.REASSIGN);
    }

    @Override
    void escalate(Incident incident, Instant now) {
        raiseLevel(incident, now);
    }

    /** Pauses the resolution clock until the reporter replies. Needs a message. */
    @Override
    void requestInfo(Incident incident, String message, Instant now) {
        requireText("message", message, 10, 2000);
        incident.pauseSla(now);
        incident.moveTo(IncidentStatus.PENDING_USER_INFO, now);
    }

    /** Stops the resolution clock. Needs a valid resolution (root cause and notes). */
    @Override
    void resolve(Incident incident, Resolution resolution, Instant now) {
        if (resolution == null) {
            throw new InputValidationException("notes", "a resolution is required");
        }
        incident.markResolved(resolution, now);
        incident.moveTo(IncidentStatus.RESOLVED, now);
    }

    /** Hands the incident to another technician; the status does not change. */
    @Override
    void reassign(Incident incident, User technician, Instant now) {
        giveTo(incident, technician);
        incident.moveTo(status(), now);
    }
}
