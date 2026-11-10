package com.iitsm.domain.exception;

public class RateLimitedException extends ItsmException {

    public RateLimitedException() {
        super("RATE_LIMITED", 429, "Too many requests. Please slow down and try again shortly.");
    }
}
