package com.iitsm.domain.escalation;

import java.time.Duration;
import java.time.Instant;

/**
 * The next move of the chain for one incident: raise it to {@code toLevel}, or, at the top, raise the one final
 * exhausted alert (DEC-49; {@code toLevel} then equals {@code fromLevel}). {@code dueAt} is when the move happens.
 */
public record EscalationStep(Kind kind, int fromLevel, int toLevel, Instant dueAt, Duration allowed) {

    public enum Kind { RAISE, EXHAUSTED }

    public boolean isDue(Instant now) {
        return !now.isBefore(dueAt);
    }

    public EscalationTarget target() {
        return EscalationTarget.ofLevel(toLevel);
    }
}
