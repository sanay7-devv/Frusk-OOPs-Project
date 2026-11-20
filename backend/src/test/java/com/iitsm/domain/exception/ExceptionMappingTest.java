package com.iitsm.domain.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.junit.jupiter.api.Test;

class ExceptionMappingTest {

    private record Expected(ItsmException exception, String code, int status) { }

    @Test
    void every_business_exception_uses_its_contract_code_and_http_status() {
        List<Expected> cases = List.of(
                new Expected(new AccountLockedException(5), "ACCOUNT_LOCKED", 423),
                new Expected(new ConflictOfInterestException(), "CONFLICT_OF_INTEREST", 403),
                new Expected(new DuplicateIncidentException(List.of()), "DUPLICATE_INCIDENT", 409),
                new Expected(new GoogleSignInUnavailableException(), "SERVICE_UNAVAILABLE", 503),
                new Expected(new IncidentNotFoundException("INC-1"), "INCIDENT_NOT_FOUND", 404),
                new Expected(new InputValidationException("title", "is required"), "VALIDATION_FAILED", 400),
                new Expected(new InvalidCredentialsException(), "INVALID_CREDENTIALS", 401),
                new Expected(new InvalidMfaCodeException(), "INVALID_MFA_CODE", 401),
                new Expected(new InvalidStateTransitionException("NEW", "CLOSE"),
                        "INVALID_STATE_TRANSITION", 409),
                new Expected(new MfaRequiredException(), "MFA_REQUIRED", 401),
                new Expected(new OptimisticLockConflictException(), "OPTIMISTIC_LOCK_CONFLICT", 409),
                new Expected(new RateLimitedException(), "RATE_LIMITED", 429),
                new Expected(new ResourceNotFoundException("Attachment", 1), "NOT_FOUND", 404),
                new Expected(new ServiceNotFoundException("email"), "SERVICE_NOT_FOUND", 404),
                new Expected(new ServiceUnavailableException(ServiceUnavailableException.Dependency.DATABASE),
                        "SERVICE_UNAVAILABLE", 503),
                new Expected(new SlaNotConfiguredException("Email", "P2"), "SLA_NOT_CONFIGURED", 422),
                new Expected(new TechnicianUnavailableException("Alex"), "TECHNICIAN_UNAVAILABLE", 409),
                new Expected(new TokenExpiredException(), "TOKEN_EXPIRED", 401),
                new Expected(new TokenInvalidException(), "TOKEN_INVALID", 401),
                new Expected(new UnauthorizedOperationException("not allowed"), "UNAUTHORIZED_OPERATION", 403),
                new Expected(new UserNotFoundException("alex@example.test"), "USER_NOT_FOUND", 404),
                new Expected(new WorkloadExceededException("Alex"), "WORKLOAD_EXCEEDED", 409));

        for (Expected expected : cases) {
            assertEquals(expected.code(), expected.exception().getCode(), expected.exception().getClass().getSimpleName());
            assertEquals(expected.status(), expected.exception().getStatus(), expected.exception().getClass().getSimpleName());
        }
        assertEquals(22, cases.size(), "keep this table aligned with the ItsmException subclasses");
    }
}
