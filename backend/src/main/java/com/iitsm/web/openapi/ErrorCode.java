package com.iitsm.web.openapi;

/**
 * Every error code the API can return, with its HTTP status and meaning (API contract B.2 plus the generic
 * framework codes of decision D-005). Used only to document the contract; the exceptions carry the same values.
 */
public enum ErrorCode {

    VALIDATION_FAILED(400, "Invalid input; see fieldErrors"),
    INVALID_CREDENTIALS(401, "Wrong email or password (never says which)"),
    MFA_REQUIRED(401, "Right password, but a code from the authenticator app is needed; log in again with the totp field"),
    INVALID_MFA_CODE(401, "Right password, but the verification code is wrong, expired or already used"),
    TOKEN_EXPIRED(401, "Access token expired; refresh or log in again"),
    TOKEN_INVALID(401, "Missing, malformed, forged or revoked token; log in again"),
    UNAUTHORIZED_OPERATION(403, "Role, permission or relation to the resource does not allow this"),
    CONFLICT_OF_INTEREST(403, "The person reported this incident and cannot handle it"),
    REQUEST_REJECTED(403, "Cross-origin request from an origin that is not allowed"),
    INCIDENT_NOT_FOUND(404, "No such incident, or the caller may not see it"),
    SERVICE_NOT_FOUND(404, "No such IT service"),
    USER_NOT_FOUND(404, "No such user"),
    NOT_FOUND(404, "No such resource (category, skill, policy) or path"),
    INVALID_STATE_TRANSITION(409, "Action not allowed in the incident's current status"),
    DUPLICATE_INCIDENT(409, "Likely duplicate; the response lists the similar incidents"),
    TECHNICIAN_UNAVAILABLE(409, "The chosen technician cannot take the incident (availability, skills, role)"),
    WORKLOAD_EXCEEDED(409, "The chosen technician is at maximum workload"),
    OPTIMISTIC_LOCK_CONFLICT(409, "Someone else changed the incident meanwhile; reload and retry"),
    SLA_NOT_CONFIGURED(422, "No SLA policy for that service and priority"),
    ACCOUNT_LOCKED(423, "Too many failed logins; try again later"),
    RATE_LIMITED(429, "Too many requests"),
    INTERNAL_ERROR(500, "Unexpected failure; no details exposed, quote the request ID"),
    SERVICE_UNAVAILABLE(503, "The database or the AI service is down; try again shortly (M14, DEC-42)");

    private final int status;
    private final String meaning;

    ErrorCode(int status, String meaning) {
        this.status = status;
        this.meaning = meaning;
    }

    public int status() {
        return status;
    }

    public String meaning() {
        return meaning;
    }
}
