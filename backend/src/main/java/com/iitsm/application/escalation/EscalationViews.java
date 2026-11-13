package com.iitsm.application.escalation;

import java.time.Instant;
import java.util.List;

import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.domain.escalation.EscalationStep;

/** Read-only shapes of the escalation module, built inside the transaction. */
public final class EscalationViews {

    private EscalationViews() {
    }

    /**
     * When an unacknowledged P1 or P2 will next move up, and to whom (A11). {@code kind} RAISE moves it to
     * {@code toLevel}; EXHAUSTED is the one final alert to the administrators at level 3 (DEC-49).
     */
    public record EscalationPreview(EscalationStep.Kind kind, int fromLevel, int toLevel, String targetRole,
                                    Instant dueAt, long secondsRemaining, List<Ref> recipients) {
    }
}
