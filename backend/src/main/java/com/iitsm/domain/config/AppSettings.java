package com.iitsm.domain.config;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.sla.AlwaysCalendar;
import com.iitsm.domain.sla.BusinessHoursCalendar;
import com.iitsm.domain.sla.CalendarType;
import com.iitsm.domain.sla.WorkCalendar;
import com.iitsm.domain.exception.InputValidationException.FieldIssue;

/**
 * An immutable, fully validated snapshot of every runtime setting, with typed accessors. The configuration service
 * swaps in a new snapshot when an administrator changes a value, so readers always see a consistent set and the
 * change takes effect at once, with no restart (handbook 2.5 M3 done-when).
 */
public final class AppSettings {

    private static final BigDecimal ONE = BigDecimal.ONE;
    private static final BigDecimal WEIGHT_TOLERANCE = new BigDecimal("0.001");

    private final Map<ConfigKey, String> values;
    private final BusinessHoursCalendar businessHours;

    private AppSettings(Map<ConfigKey, String> values) {
        this.values = Map.copyOf(values);
        this.businessHours = new BusinessHoursCalendar(
                ZoneId.of(values.get(ConfigKey.SLA_BUSINESS_ZONE)),
                LocalTime.parse(values.get(ConfigKey.SLA_BUSINESS_OPEN)),
                LocalTime.parse(values.get(ConfigKey.SLA_BUSINESS_CLOSE)),
                ConfigKey.items(values.get(ConfigKey.SLA_BUSINESS_DAYS)).stream()
                        .map(DayOfWeek::valueOf).collect(Collectors.toSet()),
                ConfigKey.items(values.get(ConfigKey.SLA_BUSINESS_HOLIDAYS)).stream()
                        .map(LocalDate::parse).collect(Collectors.toSet()));
    }

    /** The calendar an SLA policy's clocks are counted in (decision DEC-39). */
    public WorkCalendar workCalendar(CalendarType type) {
        return type == CalendarType.BUSINESS_HOURS ? businessHours : AlwaysCalendar.INSTANCE;
    }

    /**
     * Builds a snapshot from stored values (by key string); missing keys take their default and unknown keys are
     * ignored. Throws VALIDATION_FAILED with one fieldError per bad key if any rule is broken.
     */
    public static AppSettings from(Map<String, String> stored) {
        Map<ConfigKey, String> resolved = new EnumMap<>(ConfigKey.class);
        List<FieldIssue> issues = new ArrayList<>();
        for (ConfigKey key : ConfigKey.values()) {
            String value = stored.getOrDefault(key.key(), key.defaultValue());
            key.check(value).ifPresentOrElse(
                    problem -> issues.add(new FieldIssue(key.key(), problem)),
                    () -> resolved.put(key, value.strip()));
        }
        if (issues.isEmpty()) {
            issues.addAll(crossKeyIssues(resolved));
        }
        if (!issues.isEmpty()) {
            throw new InputValidationException("Some configuration values are invalid.", issues);
        }
        return new AppSettings(resolved);
    }

    public static AppSettings defaults() {
        return from(Map.of());
    }

    /** Rules that compare several keys (API Data Dictionary C.9: weights sum to 1.0, thresholds descending). */
    private static List<FieldIssue> crossKeyIssues(Map<ConfigKey, String> v) {
        List<FieldIssue> issues = new ArrayList<>();
        int p1 = Integer.parseInt(v.get(ConfigKey.PRIORITY_BAND_P1));
        int p2 = Integer.parseInt(v.get(ConfigKey.PRIORITY_BAND_P2));
        int p3 = Integer.parseInt(v.get(ConfigKey.PRIORITY_BAND_P3));
        if (!(p1 > p2 && p2 > p3)) {
            issues.add(new FieldIssue(ConfigKey.PRIORITY_BAND_P1.key(), "bands must descend: p1 > p2 > p3"));
        }
        int midUsers = Integer.parseInt(v.get(ConfigKey.PRIORITY_USERS_MID_THRESHOLD));
        int highUsers = Integer.parseInt(v.get(ConfigKey.PRIORITY_USERS_HIGH_THRESHOLD));
        if (midUsers >= highUsers) {
            issues.add(new FieldIssue(ConfigKey.PRIORITY_USERS_HIGH_THRESHOLD.key(),
                    "must be greater than priority.users.mid.threshold"));
        }
        BigDecimal midMultiplier = new BigDecimal(v.get(ConfigKey.PRIORITY_USERS_MID_MULTIPLIER));
        BigDecimal highMultiplier = new BigDecimal(v.get(ConfigKey.PRIORITY_USERS_HIGH_MULTIPLIER));
        if (midMultiplier.compareTo(highMultiplier) > 0) {
            issues.add(new FieldIssue(ConfigKey.PRIORITY_USERS_HIGH_MULTIPLIER.key(),
                    "must be at least priority.users.mid.multiplier"));
        }
        BigDecimal weightSum = new BigDecimal(v.get(ConfigKey.ASSIGNMENT_WEIGHT_SKILL))
                .add(new BigDecimal(v.get(ConfigKey.ASSIGNMENT_WEIGHT_LOAD)))
                .add(new BigDecimal(v.get(ConfigKey.ASSIGNMENT_WEIGHT_EXPERIENCE)))
                .add(new BigDecimal(v.get(ConfigKey.ASSIGNMENT_WEIGHT_PRIORITY)))
                .add(new BigDecimal(v.get(ConfigKey.ASSIGNMENT_WEIGHT_FAMILIARITY)));
        if (weightSum.subtract(ONE).abs().compareTo(WEIGHT_TOLERANCE) > 0) {
            issues.add(new FieldIssue(ConfigKey.ASSIGNMENT_WEIGHT_SKILL.key(),
                    "the five assignment weights must add up to 1.0 (now " + weightSum.stripTrailingZeros() + ")"));
        }
        int firstWarn = Integer.parseInt(v.get(ConfigKey.SLA_WARN_FIRST_PERCENT));
        int secondWarn = Integer.parseInt(v.get(ConfigKey.SLA_WARN_SECOND_PERCENT));
        if (firstWarn >= secondWarn) {
            issues.add(new FieldIssue(ConfigKey.SLA_WARN_SECOND_PERCENT.key(),
                    "must be greater than sla.warn.first.percent"));
        }
        if (!LocalTime.parse(v.get(ConfigKey.SLA_BUSINESS_OPEN))
                .isBefore(LocalTime.parse(v.get(ConfigKey.SLA_BUSINESS_CLOSE)))) {
            issues.add(new FieldIssue(ConfigKey.SLA_BUSINESS_CLOSE.key(), "must be after sla.business.open"));
        }
        BigDecimal duplicate = new BigDecimal(v.get(ConfigKey.DUP_THRESHOLD_DUPLICATE));
        BigDecimal related = new BigDecimal(v.get(ConfigKey.DUP_THRESHOLD_RELATED));
        if (duplicate.compareTo(related) <= 0) {
            issues.add(new FieldIssue(ConfigKey.DUP_THRESHOLD_DUPLICATE.key(),
                    "must be greater than dup.threshold.related"));
        }
        BigDecimal tfidfDuplicate = new BigDecimal(v.get(ConfigKey.DUP_TFIDF_THRESHOLD_DUPLICATE));
        BigDecimal tfidfRelated = new BigDecimal(v.get(ConfigKey.DUP_TFIDF_THRESHOLD_RELATED));
        if (tfidfDuplicate.compareTo(tfidfRelated) <= 0) {
            issues.add(new FieldIssue(ConfigKey.DUP_TFIDF_THRESHOLD_DUPLICATE.key(),
                    "must be greater than dup.tfidf.threshold.related"));
        }
        BigDecimal embeddingDuplicate = new BigDecimal(v.get(ConfigKey.DUP_EMBEDDING_THRESHOLD_DUPLICATE));
        BigDecimal embeddingRelated = new BigDecimal(v.get(ConfigKey.DUP_EMBEDDING_THRESHOLD_RELATED));
        if (embeddingDuplicate.compareTo(embeddingRelated) <= 0) {
            issues.add(new FieldIssue(ConfigKey.DUP_EMBEDDING_THRESHOLD_DUPLICATE.key(),
                    "must be greater than dup.embedding.threshold.related"));
        }
        BigDecimal riskWeights = new BigDecimal(v.get(ConfigKey.SLA_RISK_WEIGHT_ELAPSED))
                .add(new BigDecimal(v.get(ConfigKey.SLA_RISK_WEIGHT_LOAD)))
                .add(new BigDecimal(v.get(ConfigKey.SLA_RISK_WEIGHT_PRIORITY)))
                .add(new BigDecimal(v.get(ConfigKey.SLA_RISK_WEIGHT_HISTORY)));
        if (riskWeights.subtract(ONE).abs().compareTo(WEIGHT_TOLERANCE) > 0) {
            issues.add(new FieldIssue(ConfigKey.SLA_RISK_WEIGHT_ELAPSED.key(),
                    "the four SLA risk weights must add up to 1.0 (now " + riskWeights.stripTrailingZeros() + ")"));
        }
        return issues;
    }

    // ------------------------------------------------------------------ raw access

    public String raw(ConfigKey key) {
        return values.get(key);
    }

    public Map<ConfigKey, String> asMap() {
        return values;
    }

    // ------------------------------------------------------------------ typed accessors

    public int intValue(ConfigKey key) {
        return Integer.parseInt(values.get(key));
    }

    public BigDecimal decimalValue(ConfigKey key) {
        return new BigDecimal(values.get(key));
    }

    public int lockoutAttempts() {
        return intValue(ConfigKey.SECURITY_LOCKOUT_ATTEMPTS);
    }

    public Duration lockoutDuration() {
        return Duration.ofMinutes(intValue(ConfigKey.SECURITY_LOCKOUT_MINUTES));
    }

    public String assignmentStrategy() {
        return raw(ConfigKey.ASSIGNMENT_STRATEGY);
    }

    public Duration reopenWindow() {
        return Duration.ofDays(intValue(ConfigKey.REOPEN_WINDOW_DAYS));
    }
}
