package com.iitsm.domain.exception;

import java.util.List;

/**
 * Business-level validation failure (not Bean Validation). Named to avoid clashing with
 * jakarta.validation.ValidationException.
 */
public class InputValidationException extends ItsmException {

    public record FieldIssue(String field, String message) {
    }

    private final List<FieldIssue> fieldIssues;

    public InputValidationException(String message, List<FieldIssue> fieldIssues) {
        super("VALIDATION_FAILED", 400, message);
        this.fieldIssues = List.copyOf(fieldIssues);
    }

    public InputValidationException(String field, String message) {
        this("Please correct the highlighted fields.", List.of(new FieldIssue(field, message)));
    }

    public List<FieldIssue> getFieldIssues() {
        return fieldIssues;
    }
}
