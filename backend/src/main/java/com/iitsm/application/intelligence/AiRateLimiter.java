package com.iitsm.application.intelligence;

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
 * Per-user rate limit on the suggestion endpoints (handbook 2.5 M12): at most {@code ai.ratelimit.per.minute}
 * requests in any sliding minute, then 429 RATE_LIMITED. In memory and per instance (DEC-42); the general rate
 * limiting of module M14 will replace it. The limit is a live setting passed on each call.
 */
@Component
class AiRateLimiter {

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final Map<Long, Deque<Instant>> requests = new ConcurrentHashMap<>();
    private final Clock clock;

    AiRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Counts this request, or throws {@link RateLimitedException} if the user is over the limit. */
    void check(Long userId, int perMinute) {
        Instant now = clock.instant();
        Deque<Instant> window = requests.computeIfAbsent(userId, id -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && !window.peekFirst().isAfter(now.minus(WINDOW))) {
                window.pollFirst();
            }
            if (window.size() >= perMinute) {
                throw new RateLimitedException();
            }
            window.addLast(now);
        }
    }
}
