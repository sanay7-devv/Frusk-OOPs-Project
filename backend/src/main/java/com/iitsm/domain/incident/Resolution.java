package com.iitsm.domain.incident;

import java.util.ArrayList;
import java.util.List;

import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.InputValidationException.FieldIssue;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * How an incident was fixed: root cause, notes, steps, time spent, and whether the fix is worth reusing (suggested
 * resolutions, module M12). A value object composed into the incident; it validates itself, so an invalid
 * resolution cannot exist (API Data Dictionary C.4 limits).
 */
@Embeddable
public class Resolution {

    @Column(name = "root_cause", columnDefinition = "text")
    private String rootCause;

    @Column(name = "resolution_notes", columnDefinition = "text")
    private String notes;

    @Column(name = "resolution_steps", columnDefinition = "text")
    private String steps;

    @Column(name = "time_spent_minutes")
    private Integer timeSpentMinutes;

    @Column(name = "reusable_solution", nullable = false)
    private boolean reusable;

    protected Resolution() {
    }

    /** "Not resolved yet": all text empty, reusable false (the column is NOT NULL, so it must never be null). */
    static Resolution none() {
        return new Resolution();
    }

    public Resolution(String rootCause, String notes, String steps, int timeSpentMinutes, boolean reusable) {
        List<FieldIssue> issues = new ArrayList<>();
        checkLength(issues, "rootCause", rootCause, 10, 2000);
        checkLength(issues, "notes", notes, 10, 4000);
        if (steps != null && steps.length() > 4000) {
            issues.add(new FieldIssue("steps", "must be at most 4000 characters"));
        }
        if (timeSpentMinutes < 1 || timeSpentMinutes > 10_080) {
            issues.add(new FieldIssue("timeSpentMinutes", "must be between 1 and 10080"));
        }
        if (!issues.isEmpty()) {
            throw new InputValidationException("Please correct the highlighted fields.", issues);
        }
        this.rootCause = rootCause.strip();
        this.notes = notes.strip();
        this.steps = steps == null ? null : steps.strip();
        this.timeSpentMinutes = timeSpentMinutes;
        this.reusable = reusable;
    }

    private static void checkLength(List<FieldIssue> issues, String field, String value, int min, int max) {
        int length = value == null ? 0 : value.strip().length();
        if (length < min || length > max) {
            issues.add(new FieldIssue(field, "must be between " + min + " and " + max + " characters"));
        }
    }

    /** True once a technician has filled it in (an embedded object with only empty columns means "none yet"). */
    public boolean isPresent() {
        return rootCause != null;
    }

    public String getRootCause() {
        return rootCause;
    }

    public String getNotes() {
        return notes;
    }

    public String getSteps() {
        return steps;
    }

    public Integer getTimeSpentMinutes() {
        return timeSpentMinutes;
    }

    public boolean isReusable() {
        return reusable;
    }
}
