package com.iitsm.application.intelligence;

import org.springframework.stereotype.Component;

import com.iitsm.application.ratelimit.RateLimiter;

/**
 * Per-user rate limit on the suggestion endpoints (handbook 2.5 M12): at most {@code ai.ratelimit.per.minute}
 * requests in any sliding minute, then 429 RATE_LIMITED. Since module M14 (DEC-90) the counting is done by the shared
 * {@link RateLimiter}; this class keeps its signature and behaviour for the intelligence code.
 */
@Component
class AiRateLimiter {

    private static final String BUCKET = "AI";

    private final RateLimiter limiter;

    AiRateLimiter(RateLimiter limiter) {
        this.limiter = limiter;
    }

    /** Counts this request, or throws {@code RateLimitedException} if the user is over the limit. */
    void check(Long userId, int perMinute) {
        limiter.check(BUCKET, String.valueOf(userId), perMinute);
    }
}
