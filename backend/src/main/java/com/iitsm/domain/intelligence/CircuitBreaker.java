package com.iitsm.domain.intelligence;

import java.time.Duration;
import java.time.Instant;

/**
 * A circuit breaker for the LLM (DEC-42): after N consecutive failures it opens and the LLM is skipped for a cool-off
 * period, so a provider outage costs one slow request instead of an 8-second wait on every call. When the cool-off
 * ends, the next request is let through as a trial: a success closes the breaker, a failure re-opens it at once.
 * <p>
 * The limits are passed on each call because they are live settings. Thread-safe; time comes from the caller, so a
 * test can run it with a fixed clock.
 */
public final class CircuitBreaker {

    public enum State { CLOSED, OPEN, HALF_OPEN }

    private int consecutiveFailures;
    private Instant openUntil;

    /** True if a call may go to the LLM now. After the cool-off one trial call is allowed through. */
    public synchronized boolean allowRequest(Instant now) {
        return openUntil == null || !now.isBefore(openUntil);
    }

    public synchronized void recordSuccess() {
        consecutiveFailures = 0;
        openUntil = null;
    }

    public synchronized void recordFailure(Instant now, int failureLimit, Duration coolOff) {
        consecutiveFailures++;
        if (consecutiveFailures >= failureLimit) {
            openUntil = now.plus(coolOff);
        }
    }

    public synchronized State state(Instant now) {
        if (openUntil == null) {
            return State.CLOSED;
        }
        return now.isBefore(openUntil) ? State.OPEN : State.HALF_OPEN;
    }

    public synchronized int consecutiveFailures() {
        return consecutiveFailures;
    }
}
