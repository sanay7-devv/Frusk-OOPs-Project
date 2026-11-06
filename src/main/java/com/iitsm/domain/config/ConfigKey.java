package com.iitsm.domain.config;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Every runtime setting the system reads from app_config (handbook Appendix A.5), with its default and the range a
 * single value must stay in. Rules that compare several keys live in {@link AppSettings}.
 * A missing row means "use the default", so the system works before any seed data is loaded.
 */
public enum ConfigKey {

    PRIORITY_STRATEGY("priority.strategy", "WEIGHTED", "Active priority algorithm", Type.CHOICE, "WEIGHTED"),
    PRIORITY_BAND_P1("priority.band.p1", "60", "Minimum score for P1", Type.INTEGER, "1", "100000"),
    PRIORITY_BAND_P2("priority.band.p2", "30", "Minimum score for P2", Type.INTEGER, "1", "100000"),
    PRIORITY_BAND_P3("priority.band.p3", "10", "Minimum score for P3", Type.INTEGER, "1", "100000"),
    PRIORITY_USERS_MID_THRESHOLD("priority.users.mid.threshold", "10", "Affected users from which the mid multiplier applies",
            Type.INTEGER, "2", "1000000"),
    PRIORITY_USERS_HIGH_THRESHOLD("priority.users.high.threshold", "101", "Affected users from which the high multiplier applies",
            Type.INTEGER, "3", "1000000"),
    PRIORITY_USERS_MID_MULTIPLIER("priority.users.mid.multiplier", "1.25", "Score multiplier for mid affected users",
            Type.DECIMAL, "1", "10"),
    PRIORITY_USERS_HIGH_MULTIPLIER("priority.users.high.multiplier", "1.5", "Score multiplier for many affected users",
            Type.DECIMAL, "1", "10"),

    ASSIGNMENT_STRATEGY("assignment.strategy", "COMPOSITE", "Active technician assignment strategy", Type.CHOICE,
            "COMPOSITE", "SKILL", "LOAD", "ROUND_ROBIN", "EXPERIENCE_PRIORITY"),
    ASSIGNMENT_WEIGHT_SKILL("assignment.weight.skill", "0.40", "Composite weight: skill match", Type.DECIMAL, "0", "1"),
    ASSIGNMENT_WEIGHT_LOAD("assignment.weight.load", "0.30", "Composite weight: current load", Type.DECIMAL, "0", "1"),
    ASSIGNMENT_WEIGHT_EXPERIENCE("assignment.weight.experience", "0.20", "Composite weight: experience",
            Type.DECIMAL, "0", "1"),
    ASSIGNMENT_WEIGHT_PRIORITY("assignment.weight.priority", "0.10", "Composite weight: priority fit",
            Type.DECIMAL, "0", "1"),

    SLA_WARN_FIRST_PERCENT("sla.warn.first.percent", "75", "First SLA warning at this percent of the deadline",
            Type.INTEGER, "1", "99"),
    SLA_WARN_SECOND_PERCENT("sla.warn.second.percent", "90", "Second SLA warning at this percent of the deadline",
            Type.INTEGER, "1", "99"),
    SLA_MONITOR_INTERVAL_SECONDS("sla.monitor.interval.seconds", "60", "How often the SLA monitor runs",
            Type.INTEGER, "5", "3600"),
    ESCALATION_MONITOR_INTERVAL_SECONDS("escalation.monitor.interval.seconds", "60",
            "How often the escalation monitor runs", Type.INTEGER, "5", "3600"),

    DUP_THRESHOLD_DUPLICATE("dup.threshold.duplicate", "0.80", "Similarity from which an incident is a likely duplicate",
            Type.DECIMAL, "0", "1"),
    DUP_THRESHOLD_RELATED("dup.threshold.related", "0.65", "Similarity from which incidents are possibly related",
            Type.DECIMAL, "0", "1"),
    DUP_WINDOW_HOURS("dup.window.hours", "24", "Look-back window for duplicate detection", Type.INTEGER, "1", "720"),
    AUTOCAT_MIN_CONFIDENCE("autocat.min.confidence", "0.60", "Minimum confidence to show a category suggestion",
            Type.DECIMAL, "0", "1"),
    SLA_RISK_THRESHOLD("sla.risk.threshold", "0.70", "Risk score from which an incident is flagged at risk",
            Type.DECIMAL, "0", "1"),

    VERIFY_AUTO_HOURS("verify.auto.hours", "48", "Hours after which a resolved incident is verified automatically",
            Type.DECIMAL, "0.01", "720"),
    REOPEN_WINDOW_DAYS("reopen.window.days", "7", "Days after closure during which an incident can be reopened",
            Type.INTEGER, "1", "90"),
    AI_PRIMARY("ai.primary", "LLM", "Primary text analysis engine (falls back to KEYWORD on failure)", Type.CHOICE,
            "LLM", "KEYWORD"),

    SECURITY_LOCKOUT_ATTEMPTS("security.lockout.attempts", "5", "Failed logins before the account is locked",
            Type.INTEGER, "1", "100"),
    SECURITY_LOCKOUT_MINUTES("security.lockout.minutes", "15", "Minutes an account stays locked",
            Type.INTEGER, "1", "1440");

    /** The kind of value a key holds. */
    public enum Type { INTEGER, DECIMAL, CHOICE }

    private final String key;
    private final String defaultValue;
    private final String description;
    private final Type type;
    /** INTEGER/DECIMAL: {min, max}; CHOICE: the allowed values. */
    private final List<String> constraints;

    ConfigKey(String key, String defaultValue, String description, Type type, String... constraints) {
        this.key = key;
        this.defaultValue = defaultValue;
        this.description = description;
        this.type = type;
        this.constraints = List.of(constraints);
    }

    public String key() {
        return key;
    }

    public String defaultValue() {
        return defaultValue;
    }

    public String description() {
        return description;
    }

    public static Optional<ConfigKey> fromKey(String key) {
        return Arrays.stream(values()).filter(k -> k.key.equals(key)).findFirst();
    }

    /** Checks one value on its own; returns an error message, or empty if the value is fine. */
    public Optional<String> check(String value) {
        if (value == null || value.isBlank()) {
            return Optional.of("must not be empty");
        }
        String trimmed = value.strip();
        return switch (type) {
            case CHOICE -> constraints.contains(trimmed)
                    ? Optional.empty()
                    : Optional.of("must be one of " + String.join(", ", constraints));
            case INTEGER -> checkNumber(trimmed, true);
            case DECIMAL -> checkNumber(trimmed, false);
        };
    }

    private Optional<String> checkNumber(String value, boolean wholeNumber) {
        BigDecimal number;
        try {
            number = new BigDecimal(value);
        } catch (NumberFormatException ex) {
            return Optional.of(wholeNumber ? "must be a whole number" : "must be a number");
        }
        if (wholeNumber && number.stripTrailingZeros().scale() > 0) {
            return Optional.of("must be a whole number");
        }
        BigDecimal min = new BigDecimal(constraints.get(0));
        BigDecimal max = new BigDecimal(constraints.get(1));
        if (number.compareTo(min) < 0 || number.compareTo(max) > 0) {
            return Optional.of("must be between " + constraints.get(0) + " and " + constraints.get(1));
        }
        return Optional.empty();
    }
}
