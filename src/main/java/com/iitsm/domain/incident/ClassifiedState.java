package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.exception.InvalidStateTransitionException;
import com.iitsm.domain.user.User;

/** Status CLASSIFIED. */
final class ClassifiedState extends IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.CLASSIFIED;
    }

    @Override
    public Set<IncidentAction> legalActions(Incident incident, Instant now, Duration reopenWindow) {
        return Set.of(IncidentAction.ASSIGN);
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
}
