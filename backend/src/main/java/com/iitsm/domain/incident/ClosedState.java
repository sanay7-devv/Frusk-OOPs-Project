package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.sla.SlaTargets;
import com.iitsm.domain.exception.InvalidStateTransitionException;

/** Status CLOSED. */
final class ClosedState extends IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.CLOSED;
    }

    @Override
    public Set<IncidentAction> legalActions(Incident incident, Instant now, Duration reopenWindow) {
        return reopenable(incident) && withinWindow(incident, now, reopenWindow)
                ? Set.of(IncidentAction.REOPEN) : Set.of();
    }

    /**
     * Only an incident closed after its fix was verified can be reopened. A withdrawn report or a duplicate was never
     * worked on: the reporter files again, or follows the original incident.
     */
    private static boolean reopenable(Incident incident) {
        ClosureReason reason = incident.getClosureReason();
        return reason == ClosureReason.VERIFIED || reason == ClosureReason.AUTO_VERIFIED;
    }

    /** Reopening is possible only within the reopen window after closure (default 7 days). */
    private static boolean withinWindow(Incident incident, Instant now, Duration reopenWindow) {
        return incident.getClosedAt() != null && now.isBefore(incident.getClosedAt().plus(reopenWindow));
    }

    @Override
    void reopen(Incident incident, String reason, Instant now, Duration reopenWindow, SlaTargets targets) {
        requireText("reason", reason, 10, 1000);
        if (!reopenable(incident)) {
            throw new InvalidStateTransitionException(status().name(), IncidentAction.REOPEN.name(),
                    "an incident closed as " + incident.getClosureReason() + " cannot be reopened");
        }
        if (!withinWindow(incident, now, reopenWindow)) {
            throw new InvalidStateTransitionException(status().name(), IncidentAction.REOPEN.name(),
                    "the reopen window of " + reopenWindow.toDays() + " days after closure has passed");
        }
        incident.markReopened(now, targets);
        incident.moveTo(IncidentStatus.REOPENED, now);
    }
}
