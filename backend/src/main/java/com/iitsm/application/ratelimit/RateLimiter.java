package com.iitsm.application.ratelimit;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import com.iitsm.domain.exception.RateLimitedException;

/**
 * The one rate limiter of the system (module M14, DEC-90): a sliding-window log. For each (bucket, key) it remembers
 * the instants of the requests in the last minute; a request is refused when the window already holds the limit.
 * Exact "at most N in any 60 seconds" with no burst at a window edge. In memory and per instance (DEC-42).
 * <p>
 * Buckets in use: LOGIN, GOOGLE, INCIDENT_CREATE (the {@code RateLimitFilter}), AI ({@code AiRateLimiter}) and
 * DENIED_AUDIT (the throttle on ACCESS_DENIED audit entries). The limit is a live setting passed on each call.
 */
@Component
public class RateLimiter {

    /** What happened to a request that asked for a slot. */
    public enum Outcome { ALLOWED, FIRST_REFUSAL, REFUSED }

    private static final Duration WINDOW = Duration.ofMinutes(1);
    /** Above this many tracked keys, keys with an empty window are dropped (login keys include e-mail addresses). */
    private static final int PURGE_ABOVE = 10_000;

    private static final class Window {
        final Deque<Instant> hits = new ArrayDeque<>();
        /** True after the first refusal of the current overload was reported, so it is reported once. */
        boolean refusalReported;
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final Clock clock;

    public RateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Counts the request, or throws {@link RateLimitedException} (429) carrying the Retry-After seconds. */
    public void check(String bucket, String key, int perMinute) {
        Instant now = clock.instant();
        Window window = window(bucket, key);
        synchronized (window) {
            if (!admit(window, now, perMinute)) {
                throw new RateLimitedException(retryAfter(window, now));
            }
        }
    }

    /** Like {@link #check} but reports instead of throwing; FIRST_REFUSAL is returned once per overload. */
    public Outcome tryAcquire(String bucket, String key, int perMinute) {
        Instant now = clock.instant();
        Window window = window(bucket, key);
        synchronized (window) {
            if (admit(window, now, perMinute)) {
                window.refusalReported = false;
                return Outcome.ALLOWED;
            }
            if (!window.refusalReported) {
                window.refusalReported = true;
                return Outcome.FIRST_REFUSAL;
            }
            return Outcome.REFUSED;
        }
    }

    private boolean admit(Window window, Instant now, int perMinute) {
        Instant cutoff = now.minus(WINDOW);
        while (!window.hits.isEmpty() && !window.hits.peekFirst().isAfter(cutoff)) {
            window.hits.pollFirst();
        }
        if (window.hits.size() >= perMinute) {
            return false;
        }
        window.hits.addLast(now);
        return true;
    }

    private static int retryAfter(Window window, Instant now) {
        Instant oldest = window.hits.peekFirst();
        if (oldest == null) {
            return 1;
        }
        long seconds = Duration.between(now, oldest.plus(WINDOW)).toSeconds() + 1;
        return (int) Math.max(1, Math.min(60, seconds));
    }

    private Window window(String bucket, String key) {
        if (windows.size() > PURGE_ABOVE) {
            purge();
        }
        return windows.computeIfAbsent(bucket + '|' + key, k -> new Window());
    }

    private void purge() {
        Instant cutoff = clock.instant().minus(WINDOW);
        windows.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                Instant newest = e.getValue().hits.peekLast();
                return newest == null || !newest.isAfter(cutoff);
            }
        });
    }
}
