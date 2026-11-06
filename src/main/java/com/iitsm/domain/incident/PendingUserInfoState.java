package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

/** Status PENDING_USER_INFO. */
final class PendingUserInfoState extends IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.PENDING_USER_INFO;
    }

    @Override
    public Set<IncidentAction> legalActions(Incident incident, Instant now, Duration reopenWindow) {
        return Set.of(IncidentAction.PROVIDE_INFO);
    }

    /** The reporter replied: the clock resumes and the deadline moves later by the paused time. */
    @Override
    void provideInfo(Incident incident, String message, Instant now) {
        requireText("message", message, 1, 2000);
        incident.resumeSla(now);
        incident.moveTo(IncidentStatus.IN_PROGRESS, now);
    }
}
