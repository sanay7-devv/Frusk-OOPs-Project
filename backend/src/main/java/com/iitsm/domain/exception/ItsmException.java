package com.iitsm.domain.exception;

/**
 * Root of every business exception. Carries the machine-readable error code and
 * HTTP status from the API contract (Appendix B.2). The domain stays free of Spring
 * types, so the status is a plain int.
 */
public abstract class ItsmException extends RuntimeException {

    private final String code;
    private final int status;

    protected ItsmException(String code, int status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public int getStatus() {
        return status;
    }
}
