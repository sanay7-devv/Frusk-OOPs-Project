package com.iitsm.application.demo;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicLong;

/**
 * The clock of the recorded demo (D1, DEC-45, DEC-50): the system clock plus an offset that can only grow. An
 * administrator moves it forward ("+30 minutes") so SLA warnings and violations, escalation and auto-verify can be
 * shown on camera in seconds. It only ever exists in the demo profile; every other profile uses the system clock.
 * Plain Java, so it carries no Spring import. Time never moves backwards, which keeps audit order and SLA flags valid.
 */
public final class AdjustableClock extends Clock {

    private final Clock base;
    private final ZoneId zone;
    private final AtomicLong offsetMillis;

    public AdjustableClock(Clock base) {
        this(base, new AtomicLong());
    }

    private AdjustableClock(Clock base, AtomicLong offsetMillis) {
        this.base = base;
        this.zone = base.getZone();
        this.offsetMillis = offsetMillis;
    }

    /** Moves the clock forward and returns the total offset now in force. */
    public Duration advance(Duration amount) {
        if (amount.isNegative() || amount.isZero()) {
            throw new IllegalArgumentException("The demo clock only moves forward");
        }
        return Duration.ofMillis(offsetMillis.addAndGet(amount.toMillis()));
    }

    public Duration offset() {
        return Duration.ofMillis(offsetMillis.get());
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    /** A view in another zone that shares the same offset. */
    @Override
    public Clock withZone(ZoneId newZone) {
        return new AdjustableClock(base.withZone(newZone), offsetMillis);
    }

    @Override
    public Instant instant() {
        return base.instant().plusMillis(offsetMillis.get());
    }
}
