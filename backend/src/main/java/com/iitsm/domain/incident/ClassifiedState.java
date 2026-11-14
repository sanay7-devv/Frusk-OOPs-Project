package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.exception.InvalidStateTransitionException;
import com.iitsm.domain.user.User;

/** Status CLASSIFIED. */
final class ClassifiedState extends OpenState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.CLASSIFIED;
    }

    @Override
    Set<IncidentAction> ownActions(Incident incident, Instant now, Duration reopenWindow) {
        return Set.of(IncidentAction.ASSIGN, IncidentAction.WITHDRAW);
    }

    /** In triage with nobody to take it: the escalation monitor watches it from level 0 (DEC-48). */
    @Override
    boolean isUnattended(Incident incident) {
        return incident.getAssignee() == null;
    }

    /** Needs a technician and a known priority. */
    @Override
    void assign(Incident incident, User technician, Instant now) {
        if (incident.getPriority() == null) {
            throw new InvalidStateTransitionException(status().name(), IncidentAction.ASSIGN.name(),
                    "the priority is not known yet");
        }
        giveTo(incident, technician);
        incident.moveTo(IncidentStatus.ASSIGNED, now);
    }

    /** The reporter withdraws the report before work starts (G3). */
    @Override
    void withdraw(Incident incident, String reason, Instant now) {
        withdrawBeforeWork(incident, reason, now);
    }
}
