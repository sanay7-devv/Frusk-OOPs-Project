package com.iitsm.web.handler;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.TypeMismatchException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.event.SecurityAuditEvent;
import com.iitsm.domain.exception.DuplicateIncidentException;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.ItsmException;
import com.iitsm.domain.exception.OptimisticLockConflictException;
import com.iitsm.web.dto.ErrorResponse;
import com.iitsm.web.filter.RequestIdFilter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.persistence.OptimisticLockException;
import jakarta.validation.ConstraintViolationException;

/**
 * The single place that turns exceptions into the standard error body (API Data Dictionary B.1/B.2).
 * <p>
 * Order of concern: our own ItsmException family first, then Bean Validation, then Spring MVC's standard
 * exceptions (inherited from ResponseEntityExceptionHandler, re-shaped in handleExceptionInternal), and last a
 * catch-all that returns INTERNAL_ERROR without leaking details.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String VALIDATION_MESSAGE = "Please correct the highlighted fields.";

    private final ApplicationEventPublisher events;
    private final Clock clock;

    public GlobalExceptionHandler(ApplicationEventPublisher events, Clock clock) {
        this.events = events;
        this.clock = clock;
    }

    /**
     * Every refused request (403) is audited as ACCESS_DENIED (handbook 2.5 M2, 2.10). The audit listener writes it
     * in its own transaction, so it survives the rollback of the refused action; a failure here never changes the
     * error the client gets.
     */
    private void auditDenied(HttpServletRequest request, String code, String message) {
        try {
            Long actorId = SecurityContextHolder.getContext().getAuthentication() != null
                    && SecurityContextHolder.getContext().getAuthentication().getPrincipal()
                    instanceof AuthenticatedUser caller ? caller.id() : null;
            events.publishEvent(new SecurityAuditEvent(AuditAction.ACCESS_DENIED, actorId,
                    code + " on " + request.getMethod() + " " + request.getRequestURI() + ": " + message,
                    clock.instant()));
        } catch (RuntimeException ex) {
            log.warn("Could not audit a refused request: {}", ex.toString());
        }
    }

    // ------------------------------------------------------------------ business exceptions

    @ExceptionHandler(InputValidationException.class)
    public ResponseEntity<Object> handleInputValidation(InputValidationException ex, HttpServletRequest request) {
        List<ErrorResponse.FieldError> fieldErrors = ex.getFieldIssues().stream()
                .map(issue -> new ErrorResponse.FieldError(issue.field(), issue.message()))
                .toList();
        return respond(ErrorResponse.of(ex.getStatus(), ex.getCode(), ex.getMessage(), request.getRequestURI())
                .withFieldErrors(fieldErrors));
    }

    @ExceptionHandler(DuplicateIncidentException.class)
    public ResponseEntity<Object> handleDuplicateIncident(DuplicateIncidentException ex, HttpServletRequest request) {
        return respond(ErrorResponse.of(ex.getStatus(), ex.getCode(), ex.getMessage(), request.getRequestURI())
                .withSimilar(ex.getSimilar()));
    }

    @ExceptionHandler(ItsmException.class)
    public ResponseEntity<Object> handleItsm(ItsmException ex, HttpServletRequest request) {
        log.debug("Business exception {}: {}", ex.getCode(), ex.getMessage());
        if (ex.getStatus() == 403) {
            auditDenied(request, ex.getCode(), ex.getMessage());
        }
        return respond(ErrorResponse.of(ex.getStatus(), ex.getCode(), ex.getMessage(), request.getRequestURI()));
    }

    // ------------------------------------------------------------------ security exceptions thrown inside MVC

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        auditDenied(request, "UNAUTHORIZED_OPERATION", "missing permission");
        return respond(ErrorResponse.of(403, "UNAUTHORIZED_OPERATION",
                "Your role or permissions do not allow this action.", request.getRequestURI()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Object> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        return respond(ErrorResponse.of(401, "TOKEN_INVALID", "Authentication required. Log in again.",
                request.getRequestURI()));
    }

    // ------------------------------------------------------------------ concurrent updates

    /** Two updates of the same incident at once: the version column lets exactly one win (handbook 2.5 M4). */
    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, OptimisticLockException.class})
    public ResponseEntity<Object> handleOptimisticLock(Exception ex, HttpServletRequest request) {
        OptimisticLockConflictException conflict = new OptimisticLockConflictException();
        return respond(ErrorResponse.of(conflict.getStatus(), conflict.getCode(), conflict.getMessage(),
                request.getRequestURI()));
    }

    // ------------------------------------------------------------------ Bean Validation outside controllers

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Object> handleConstraintViolation(ConstraintViolationException ex,
                                                            HttpServletRequest request) {
        List<ErrorResponse.FieldError> fieldErrors = ex.getConstraintViolations().stream()
                .map(v -> new ErrorResponse.FieldError(lastSegment(v.getPropertyPath().toString()), v.getMessage()))
                .toList();
        return respond(ErrorResponse.of(400, "VALIDATION_FAILED", VALIDATION_MESSAGE, request.getRequestURI())
                .withFieldErrors(fieldErrors));
    }

    // ------------------------------------------------------------------ catch-all

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpected(Exception ex, HttpServletRequest request) {
        String requestId = MDC.get(RequestIdFilter.MDC_KEY);
        log.error("Unhandled exception on {} {} (requestId={})", request.getMethod(), request.getRequestURI(),
                requestId, ex);
        String message = requestId == null
                ? "Something went wrong on our side."
                : "Something went wrong on our side. Quote request ID " + requestId + " if you report this.";
        return respond(ErrorResponse.of(500, "INTERNAL_ERROR", message, request.getRequestURI()));
    }

    // ------------------------------------------------------------------ Spring MVC standard exceptions

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        List<ErrorResponse.FieldError> fieldErrors = new ArrayList<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> fieldErrors.add(new ErrorResponse.FieldError(e.getField(), e.getDefaultMessage())));
        ex.getBindingResult().getGlobalErrors()
                .forEach(e -> fieldErrors.add(new ErrorResponse.FieldError(e.getObjectName(), e.getDefaultMessage())));
        return validationFailed(fieldErrors, request);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(HandlerMethodValidationException ex,
                                                                            HttpHeaders headers,
                                                                            HttpStatusCode status,
                                                                            WebRequest request) {
        List<ErrorResponse.FieldError> fieldErrors = new ArrayList<>();
        ex.getParameterValidationResults().forEach(result -> {
            String name = result.getMethodParameter().getParameterName();
            result.getResolvableErrors().forEach(error -> fieldErrors.add(
                    new ErrorResponse.FieldError(name != null ? name : "parameter", error.getDefaultMessage())));
        });
        return validationFailed(fieldErrors, request);
    }

    @Override
    protected ResponseEntity<Object> handleMissingServletRequestParameter(MissingServletRequestParameterException ex,
                                                                          HttpHeaders headers, HttpStatusCode status,
                                                                          WebRequest request) {
        return validationFailed(List.of(new ErrorResponse.FieldError(ex.getParameterName(), "is required")), request);
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex, HttpHeaders headers,
                                                        HttpStatusCode status, WebRequest request) {
        String field = ex.getPropertyName() != null ? ex.getPropertyName() : "parameter";
        return validationFailed(List.of(new ErrorResponse.FieldError(field, "has an invalid value")), request);
    }

    /** Every other framework exception (404, 405, 415, malformed JSON, ...) ends up here. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
                                                             HttpStatusCode statusCode, WebRequest request) {
        int status = statusCode.value();
        if (status >= 500) {
            log.error("Framework exception {} (requestId={})", ex.getClass().getSimpleName(),
                    MDC.get(RequestIdFilter.MDC_KEY), ex);
        }
        ErrorResponse error = ErrorResponse.of(status, frameworkCode(status), frameworkMessage(status), path(request));
        return ResponseEntity.status(status)
                .headers(headers)
                .contentType(MediaType.APPLICATION_JSON)
                .body(error);
    }

    // ------------------------------------------------------------------ helpers

    private ResponseEntity<Object> validationFailed(List<ErrorResponse.FieldError> fieldErrors, WebRequest request) {
        return respond(ErrorResponse.of(400, "VALIDATION_FAILED", VALIDATION_MESSAGE, path(request))
                .withFieldErrors(fieldErrors));
    }

    private static ResponseEntity<Object> respond(ErrorResponse body) {
        return ResponseEntity.status(body.status())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    private static String path(WebRequest request) {
        return request instanceof ServletWebRequest servletRequest ? servletRequest.getRequest().getRequestURI() : "";
    }

    private static String lastSegment(String propertyPath) {
        int dot = propertyPath.lastIndexOf('.');
        return dot >= 0 ? propertyPath.substring(dot + 1) : propertyPath;
    }

    /** Codes for framework-level failures. 400 reuses VALIDATION_FAILED from the contract, the rest are generic. */
    private static String frameworkCode(int status) {
        return switch (status) {
            case 400 -> "VALIDATION_FAILED";
            case 404 -> "NOT_FOUND";
            case 405 -> "METHOD_NOT_ALLOWED";
            case 406 -> "NOT_ACCEPTABLE";
            case 415 -> "UNSUPPORTED_MEDIA_TYPE";
            default -> status >= 500 ? "INTERNAL_ERROR" : "REQUEST_REJECTED";
        };
    }

    private static String frameworkMessage(int status) {
        return switch (status) {
            case 400 -> "The request could not be understood. Check the body and parameters.";
            case 404 -> "The requested resource was not found.";
            case 405 -> "This HTTP method is not supported here.";
            case 406 -> "The requested response format is not supported.";
            case 415 -> "The request content type is not supported.";
            default -> status >= 500 ? "Something went wrong on our side." : "The request could not be processed.";
        };
    }
}
