package com.iitsm.web.dto;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.iitsm.domain.exception.SimilarIncidentRef;

/**
 * The one error body returned for every failure (API Data Dictionary B.1 and C.10).
 * {@code fieldErrors} is always present and is empty unless the failure is a validation error.
 * {@code similar} appears only on DUPLICATE_INCIDENT responses (null is omitted from the JSON).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        List<FieldError> fieldErrors,
        List<SimilarIncidentRef> similar) {

    public record FieldError(String field, String message) {
    }

    public static ErrorResponse of(int status, String code, String message, String path) {
        return new ErrorResponse(Instant.now(), status, code, message, path, List.of(), null);
    }

    public ErrorResponse withFieldErrors(List<FieldError> errors) {
        return new ErrorResponse(timestamp, status, code, message, path, List.copyOf(errors), similar);
    }

    public ErrorResponse withSimilar(List<SimilarIncidentRef> refs) {
        return new ErrorResponse(timestamp, status, code, message, path, fieldErrors, List.copyOf(refs));
    }
}
