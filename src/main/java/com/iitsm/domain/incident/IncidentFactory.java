package com.iitsm.domain.incident;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import com.iitsm.domain.category.Category;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.InputValidationException.FieldIssue;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.user.User;

/**
 * Factory pattern: the one place that builds a new incident (handbook 2.5 M4). It validates every field, takes the
 * next code (INC-2026-00001) from the sequence, creates the incident in NEW and immediately classifies it, so an
 * invalid or half-built incident can never exist.
 */
public class IncidentFactory {

    private final IncidentCodeGenerator codes;
    private final Clock clock;

    public IncidentFactory(IncidentCodeGenerator codes, Clock clock) {
        this.codes = codes;
        this.clock = clock;
    }

    /** @param category null when none was chosen: the incident then waits in triage */
    public Incident create(User reporter, ItService service, Category category, String title, String description,
                           int impact, int urgency, int affectedUsers) {
        validate(service, category, title, description, impact, urgency, affectedUsers);
        Instant now = clock.instant();
        String code = codes.nextCode(now.atZone(ZoneOffset.UTC).getYear());
        Incident incident = new Incident(code, title.strip(), description.strip(), reporter, service, impact,
                urgency, affectedUsers, now);
        incident.classify(category, now);
        return incident;
    }

    private static void validate(ItService service, Category category, String title, String description,
                                 int impact, int urgency, int affectedUsers) {
        List<FieldIssue> issues = new ArrayList<>();
        if (!service.isActive()) {
            issues.add(new FieldIssue("serviceId", "the service is not active"));
        }
        if (category != null && !category.isActive()) {
            issues.add(new FieldIssue("categoryId", "the category is not active"));
        }
        checkLength(issues, "title", title, 5, 200);
        checkLength(issues, "description", description, 20, 5000);
        checkRange(issues, "impact", impact, 1, 5);
        checkRange(issues, "urgency", urgency, 1, 5);
        checkRange(issues, "affectedUsers", affectedUsers, 1, 1_000_000);
        if (!issues.isEmpty()) {
            throw new InputValidationException("Please correct the highlighted fields.", issues);
        }
    }

    private static void checkLength(List<FieldIssue> issues, String field, String value, int min, int max) {
        int length = value == null ? 0 : value.strip().length();
        if (length < min || length > max) {
            issues.add(new FieldIssue(field, "must be between " + min + " and " + max + " characters"));
        }
    }

    private static void checkRange(List<FieldIssue> issues, String field, int value, int min, int max) {
        if (value < min || value > max) {
            issues.add(new FieldIssue(field, "must be between " + min + " and " + max));
        }
    }
}
