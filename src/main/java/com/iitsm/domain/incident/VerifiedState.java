package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.exception.InvalidStateTransitionException;

/** Status VERIFIED. */
final class VerifiedState extends IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.VERIFIED;
    }

    @Override
    public Set<IncidentAction> legalActions(Incident incident, Instant now, Duration reopenWindow) {
        return Set.of(IncidentAction.CLOSE);
    }

    /** Normal close after verification (VERIFIED) or by the auto-verify job (AUTO_VERIFIED). */
    @Override
    void close(Incident incident, ClosureReason reason, Instant now) {
        if (reason != ClosureReason.VERIFIED && reason != ClosureReason.AUTO_VERIFIED) {
            throw new InvalidStateTransitionException(status().name(), IncidentAction.CLOSE.name(),
                    "a verified incident closes as VERIFIED or AUTO_VERIFIED");
        }
        incident.markClosed(reason, now);
        incident.moveTo(IncidentStatus.CLOSED, now);
    }
}
