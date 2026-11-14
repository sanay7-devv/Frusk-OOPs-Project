package com.iitsm.domain.exception;

/**
 * A dependency the request needs is down: the database or the AI service (handbook 2.5 M14, DEC-42 "outage
 * behaviour"). Rendered as 503 SERVICE_UNAVAILABLE in the standard error body, never with a stack trace.
 */
public class ServiceUnavailableException extends ItsmException {

    /** What is down, for the message the user sees. */
    public enum Dependency {
        DATABASE("The service is temporarily unavailable (database not reachable). Please try again in a minute."),
        AI("The AI assistant is temporarily unavailable. Please try again shortly or continue without it.");

        private final String message;

        Dependency(String message) {
            this.message = message;
        }
    }

    private final Dependency dependency;

    public ServiceUnavailableException(Dependency dependency) {
        super("SERVICE_UNAVAILABLE", 503, dependency.message);
        this.dependency = dependency;
    }

    public Dependency getDependency() {
        return dependency;
    }
}
