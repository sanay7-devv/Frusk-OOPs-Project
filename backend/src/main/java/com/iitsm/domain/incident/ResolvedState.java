package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.sla.SlaTargets;

/** Status RESOLVED. */
final class ResolvedState extends IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.RESOLVED;
    }

    @Override
    public Set<IncidentAction> legalActions(Incident incident, Instant now, Duration reopenWindow) {
        return Set.of(IncidentAction.VERIFY, IncidentAction.REOPEN);
    }

    @Override
    void verify(Incident incident, Instant now) {
        incident.moveTo(IncidentStatus.VERIFIED, now);
    }

    @Override
    void reopen(Incident incident, String reason, Instant now, Duration reopenWindow, SlaTargets targets) {
        requireText("reason", reason, 10, 1000);
        incident.markReopened(now, targets);
        incident.moveTo(IncidentStatus.REOPENED, now);
    }
}
