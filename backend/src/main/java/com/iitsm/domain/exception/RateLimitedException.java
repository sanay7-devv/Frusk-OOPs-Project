package com.iitsm.domain.exception;

public class RateLimitedException extends ItsmException {

    private final int retryAfterSeconds;

    public RateLimitedException() {
        this(60);
    }

    /** @param retryAfterSeconds how long until the caller's oldest counted request leaves the window (M14) */
    public RateLimitedException(int retryAfterSeconds) {
        super("RATE_LIMITED", 429, "Too many requests. Please slow down and try again shortly.");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public int getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
