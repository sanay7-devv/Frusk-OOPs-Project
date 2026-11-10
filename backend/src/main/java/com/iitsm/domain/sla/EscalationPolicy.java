package com.iitsm.domain.sla;

import java.time.Duration;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.priority.Priority;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * How long a P1 or P2 incident may stay unacknowledged at the previous level before it moves up to {@code level}
 * (1 = Team Lead, 2 = System Admin, 3 = IT Manager). Table escalation_policies; used by the escalation chain (M11).
 */
@Entity
@Table(name = "escalation_policies",
        uniqueConstraints = @UniqueConstraint(name = "uk_escalation_policies_priority_level",
                columnNames = {"priority", "level"}),
        check = @CheckConstraint(name = "ck_escalation_policies_level", constraint = "level BETWEEN 1 AND 3"))
public class EscalationPolicy {

    public static final int MAX_TIMEOUT_MINUTES = 1_440;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "priority", nullable = false, length = 2)
    private Priority priority;

    @Column(name = "level", nullable = false)
    private short level;

    @Column(name = "timeout_minutes", nullable = false)
    private int timeoutMinutes;

    protected EscalationPolicy() {
    }

    public EscalationPolicy(Priority priority, int level, int timeoutMinutes) {
        if (priority != Priority.P1 && priority != Priority.P2) {
            throw new InputValidationException("priority", "escalation applies to P1 and P2 only");
        }
        if (level < 1 || level > 3) {
            throw new InputValidationException("level", "must be between 1 and 3");
        }
        this.priority = priority;
        this.level = (short) level;
        changeTimeout(timeoutMinutes);
    }

    public Long getId() {
        return id;
    }

    public Priority getPriority() {
        return priority;
    }

    public int getLevel() {
        return level;
    }

    public int getTimeoutMinutes() {
        return timeoutMinutes;
    }

    public Duration timeout() {
        return Duration.ofMinutes(timeoutMinutes);
    }

    public void changeTimeout(int minutes) {
        if (minutes < 1 || minutes > MAX_TIMEOUT_MINUTES) {
            throw new InputValidationException("timeoutMinutes", "must be between 1 and " + MAX_TIMEOUT_MINUTES);
        }
        this.timeoutMinutes = minutes;
    }
}
