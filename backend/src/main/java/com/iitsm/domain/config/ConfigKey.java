package com.iitsm.domain.config;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

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
    // Composite weights (decision DEC-28 added service familiarity to the handbook's four factors)
    ASSIGNMENT_WEIGHT_SKILL("assignment.weight.skill", "0.35", "Composite weight: skill match", Type.DECIMAL, "0", "1"),
    ASSIGNMENT_WEIGHT_LOAD("assignment.weight.load", "0.25", "Composite weight: current load", Type.DECIMAL, "0", "1"),
    ASSIGNMENT_WEIGHT_EXPERIENCE("assignment.weight.experience", "0.15", "Composite weight: experience",
            Type.DECIMAL, "0", "1"),
    ASSIGNMENT_WEIGHT_PRIORITY("assignment.weight.priority", "0.10", "Composite weight: priority fit",
            Type.DECIMAL, "0", "1"),
    ASSIGNMENT_WEIGHT_FAMILIARITY("assignment.weight.familiarity", "0.15",
            "Composite weight: past fixes on the same service", Type.DECIMAL, "0", "1"),
    ASSIGNMENT_FAMILIARITY_WINDOW_DAYS("assignment.familiarity.window.days", "90",
            "How far back resolved incidents count toward service familiarity", Type.INTEGER, "1", "365"),
    ASSIGNMENT_FAMILIARITY_TARGET("assignment.familiarity.target", "5",
            "Resolved incidents on a service that count as full familiarity", Type.INTEGER, "1", "100"),

    SLA_WARN_FIRST_PERCENT("sla.warn.first.percent", "75", "First SLA warning at this percent of the deadline",
            Type.INTEGER, "1", "99"),
    SLA_WARN_SECOND_PERCENT("sla.warn.second.percent", "90", "Second SLA warning at this percent of the deadline",
            Type.INTEGER, "1", "99"),
    SLA_MONITOR_INTERVAL_SECONDS("sla.monitor.interval.seconds", "60", "How often the SLA monitor runs",
            Type.INTEGER, "5", "3600"),
    // the company business-hours calendar used by SLA policies of type BUSINESS_HOURS (decision DEC-39)
    SLA_BUSINESS_ZONE("sla.business.zone", "Asia/Kolkata", "Time zone of the business-hours calendar", Type.ZONE),
    SLA_BUSINESS_OPEN("sla.business.open", "09:00", "Business hours start (HH:mm)", Type.TIME),
    SLA_BUSINESS_CLOSE("sla.business.close", "18:00", "Business hours end (HH:mm)", Type.TIME),
    SLA_BUSINESS_DAYS("sla.business.days", "MON,TUE,WED,THU,FRI", "Working days, comma separated", Type.DAYS),
    SLA_BUSINESS_HOLIDAYS("sla.business.holidays", "", "Holidays, comma separated yyyy-MM-dd (may be empty)",
            Type.DATES),
    ESCALATION_MONITOR_INTERVAL_SECONDS("escalation.monitor.interval.seconds", "60",
            "How often the escalation monitor runs", Type.INTEGER, "5", "3600"),
    ESCALATION_EXHAUSTED_MINUTES("escalation.exhausted.minutes", "15",
            "Minutes an unacknowledged P1 or P2 may stay at level 3 before the one final 'escalation exhausted' alert",
            Type.INTEGER, "1", "1440"),

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
    VERIFY_MONITOR_INTERVAL_SECONDS("verify.monitor.interval.seconds", "300",
            "How often the auto-verify job looks for resolved incidents nobody confirmed", Type.INTEGER, "5", "3600"),
    REOPEN_WINDOW_DAYS("reopen.window.days", "7", "Days after closure during which an incident can be reopened",
            Type.INTEGER, "1", "90"),
    AI_PRIMARY("ai.primary", "LLM", "Primary text analysis engine (falls back to KEYWORD on failure)", Type.CHOICE,
            "LLM", "KEYWORD"),

    // notifications (module M9, decisions DEC-40, DEC-42, DEC-54)
    NOTIFICATION_DIGEST_THRESHOLD("notification.digest.threshold", "5",
            "SLA warnings one person may get in one monitor run before they are folded into one digest",
            Type.INTEGER, "1", "1000"),
    NOTIFICATION_EMAIL_RETRIES("notification.email.retries", "3",
            "Retries after a failed email (the first attempt is not counted)", Type.INTEGER, "0", "10"),
    NOTIFICATION_EMAIL_BACKOFF_SECONDS("notification.email.backoff.seconds", "2",
            "Wait before the first email retry; doubles with every retry", Type.INTEGER, "1", "300"),
    NOTIFICATION_EMAIL_FROM("notification.email.from", "no-reply@iitsm.local",
            "Sender address of notification emails", Type.EMAIL),
    NOTIFICATION_LINK_BASE_URL("notification.link.base.url", "http://localhost:5173",
            "Frontend address used for links in emails", Type.URL),
    NOTIFICATION_CHAT_WEBHOOK_URL("notification.chat.webhook.url", "",
            "Incoming-webhook URL of the chat room; empty means chat messages are only logged", Type.OPTIONAL_URL),
    // M12 intelligence (DEC-M12-1 to DEC-M12-9). The two dup.* thresholds above were written for embeddings; the default
    // similarity is TF-IDF, which scores lower for the same pair of texts, so it has its own calibrated pair.
    DUP_TFIDF_THRESHOLD_DUPLICATE("dup.tfidf.threshold.duplicate", "0.55",
            "TF-IDF similarity from which an incident is a likely duplicate", Type.DECIMAL, "0", "1"),
    DUP_TFIDF_THRESHOLD_RELATED("dup.tfidf.threshold.related", "0.35",
            "TF-IDF similarity from which incidents are possibly related", Type.DECIMAL, "0", "1"),
    RESOLUTION_MIN_SIMILARITY("resolution.min.similarity", "0.30",
            "Minimum TF-IDF similarity for a resolved incident to be suggested as a fix", Type.DECIMAL, "0", "1"),
    AI_IDF_WINDOW_DAYS("ai.idf.window.days", "90",
            "How far back incident texts count when TF-IDF weights words by rarity", Type.INTEGER, "1", "365"),
    AI_TIMEOUT_SECONDS("ai.timeout.seconds", "8", "Seconds to wait for the LLM before using the keyword engine",
            Type.INTEGER, "1", "60"),
    AI_BREAKER_FAILURES("ai.breaker.failures", "3", "Consecutive LLM failures after which the LLM is skipped",
            Type.INTEGER, "1", "100"),
    AI_BREAKER_COOLOFF_SECONDS("ai.breaker.cooloff.seconds", "60", "Seconds the LLM is skipped after the breaker opens",
            Type.INTEGER, "1", "86400"),
    AI_CACHE_TTL_SECONDS("ai.cache.ttl.seconds", "60", "Seconds an identical suggestion request reuses its answer",
            Type.INTEGER, "0", "3600"),
    AI_RATE_LIMIT_PER_MINUTE("ai.ratelimit.per.minute", "20", "Suggestion requests per user per minute (429 above)",
            Type.INTEGER, "1", "10000"),
    SLA_RISK_WEIGHT_ELAPSED("sla.risk.weight.elapsed", "0.50", "SLA risk weight: share of resolution time elapsed",
            Type.DECIMAL, "0", "1"),
    SLA_RISK_WEIGHT_LOAD("sla.risk.weight.load", "0.20", "SLA risk weight: assigned technician's load ratio",
            Type.DECIMAL, "0", "1"),
    SLA_RISK_WEIGHT_PRIORITY("sla.risk.weight.priority", "0.15", "SLA risk weight: priority", Type.DECIMAL, "0", "1"),
    SLA_RISK_WEIGHT_HISTORY("sla.risk.weight.history", "0.15",
            "SLA risk weight: how long similar past incidents took against the target", Type.DECIMAL, "0", "1"),
    SLA_RISK_SCAN_INTERVAL_SECONDS("sla.risk.scan.interval.seconds", "300", "How often the SLA risk scan runs",
            Type.INTEGER, "5", "86400"),
    // search, reports and coverage risk (module M10)
    REPORT_EXPORT_MAX_ROWS("report.export.max.rows", "10000", "Most rows a CSV export writes", Type.INTEGER, "1", "100000"),
    REPORT_TREND_MAX_BUCKETS("report.trend.max.buckets", "400", "Most days or weeks one trend report may span",
            Type.INTEGER, "1", "5000"),
    COVERAGE_WINDOW_DAYS("coverage.window.days", "90",
            "How far back incidents tie a service to the categories it needs (coverage risk report)", Type.INTEGER,
            "1", "365"),
    COVERAGE_MIN_CRITICALITY("coverage.min.criticality", "4",
            "Services from this criticality on are flagged when coverage is thin", Type.INTEGER, "1", "5"),
    COVERAGE_MIN_HOLDERS("coverage.min.holders", "2",
            "Available technicians a flagged service's category needs at least", Type.INTEGER, "1", "50"),
    SAVED_FILTERS_MAX("saved.filters.max", "20", "Most saved incident views one user may keep", Type.INTEGER, "1", "200"),

    SECURITY_LOCKOUT_ATTEMPTS("security.lockout.attempts", "5", "Failed logins before the account is locked",
            Type.INTEGER, "1", "100"),
    SECURITY_LOCKOUT_MINUTES("security.lockout.minutes", "15", "Minutes an account stays locked",
            Type.INTEGER, "1", "1440"),

    // M14 hardening (session C, DEC-90 to DEC-93)
    RATELIMIT_LOGIN_PER_MINUTE("ratelimit.login.per.minute", "10",
            "Login attempts per client address and e-mail (Google sign-in: per address) per minute (429 above)",
            Type.INTEGER, "1", "1000"),
    RATELIMIT_INCIDENT_CREATE_PER_MINUTE("ratelimit.incident.create.per.minute", "20",
            "Incidents one user may create per minute (429 above)", Type.INTEGER, "1", "1000"),
    RATELIMIT_DENIED_AUDIT_PER_MINUTE("ratelimit.denied.audit.per.minute", "20",
            "ACCESS_DENIED audit entries written per user (or address) per minute; the rest is summarised in one entry",
            Type.INTEGER, "1", "1000"),
    AUDIT_SEAL_INTERVAL_SECONDS("audit.seal.interval.seconds", "300",
            "How often new audit records are sealed (tamper evidence, S3)", Type.INTEGER, "10", "86400");

    /** The kind of value a key holds. */
    public enum Type { INTEGER, DECIMAL, CHOICE, TIME, ZONE, DAYS, DATES, EMAIL, URL, OPTIONAL_URL }

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
        if (value == null || (value.isBlank() && type != Type.DATES && type != Type.OPTIONAL_URL)) {
            return Optional.of("must not be empty");
        }
        String trimmed = value.strip();
        return switch (type) {
            case CHOICE -> constraints.contains(trimmed)
                    ? Optional.empty()
                    : Optional.of("must be one of " + String.join(", ", constraints));
            case INTEGER -> checkNumber(trimmed, true);
            case DECIMAL -> checkNumber(trimmed, false);
            case TIME -> parses(() -> LocalTime.parse(trimmed), "must be a time like 09:00");
            case ZONE -> parses(() -> ZoneId.of(trimmed), "must be a time zone like Asia/Kolkata");
            case DAYS -> parses(() -> {
                List<String> days = items(trimmed);
                days.forEach(DayOfWeek::valueOf);
                if (days.isEmpty() || days.size() != Set.copyOf(days).size()) {
                    throw new IllegalArgumentException();
                }
            }, "must be distinct days like MON,TUE,WED,THU,FRI");
            case DATES -> parses(() -> items(trimmed).forEach(LocalDate::parse),
                    "must be dates like 2026-12-25,2027-01-26 (or empty)");
            case EMAIL -> trimmed.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")
                    ? Optional.empty()
                    : Optional.of("must be an email address like no-reply@iitsm.local");
            case URL, OPTIONAL_URL -> trimmed.isEmpty() ? Optional.empty() : checkHttpUrl(trimmed);
        };
    }

    /** Comma-separated items, blanks removed; day names may be written MON or MONDAY. */
    public static List<String> items(String value) {
        return Arrays.stream(value.split(","))
                .map(String::strip)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toUpperCase(Locale.ROOT))
                .map(s -> s.length() == 3 ? expandDay(s) : s)
                .toList();
    }

    private static String expandDay(String abbreviation) {
        return Arrays.stream(DayOfWeek.values())
                .map(DayOfWeek::name)
                .filter(name -> name.startsWith(abbreviation))
                .findFirst()
                .orElse(abbreviation);
    }

    private static Optional<String> checkHttpUrl(String value) {
        try {
            java.net.URI uri = java.net.URI.create(value);
            boolean http = "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
            return http && uri.getHost() != null ? Optional.empty() : Optional.of("must be an http or https address");
        } catch (IllegalArgumentException ex) {
            return Optional.of("must be an http or https address");
        }
    }

    private static Optional<String> parses(Runnable parser, String problem) {
        try {
            parser.run();
            return Optional.empty();
        } catch (RuntimeException ex) {
            return Optional.of(problem);
        }
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
