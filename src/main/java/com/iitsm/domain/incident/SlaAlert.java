package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;

/**
 * One SLA alert raised by the monitor for one clock of an incident: a first or second warning before the deadline,
 * or the violation once it has passed (handbook 1.7). Produced by {@link SlaTracker} when it flips a fire-once flag.
 *
 * @param percent        how much of the clock had run when the alert fired (100 or more for a violation)
 * @param overdueSeconds how long the deadline had passed (0 for warnings)
 */
public record SlaAlert(SlaClockType clock, Level level, Instant due, int percent, long overdueSeconds) {

    public enum Level { FIRST_WARNING, SECOND_WARNING, VIOLATION }

    static SlaAlert of(SlaClockType clock, Level level, Instant now, Instant due, Duration target) {
        int percent = (int) Math.floor(SlaTracker.elapsedPercent(now, due, target));
        long overdue = level == Level.VIOLATION ? Math.max(0, Duration.between(due, now).toSeconds()) : 0;
        return new SlaAlert(clock, level, due, percent, overdue);
    }

    public boolean isViolation() {
        return level == Level.VIOLATION;
    }
}
