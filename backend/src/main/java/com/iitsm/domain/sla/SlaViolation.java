package com.iitsm.domain.sla;

import java.time.Instant;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.SlaAlert;
import com.iitsm.domain.incident.SlaClockType;
import com.iitsm.domain.user.User;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A missed SLA deadline (table sla_violations, handbook Appendix A.3): which clock, how late it was when the monitor
 * noticed, and who was assigned at that moment. Written once by the SLA monitor and never changed.
 */
@Entity
@Table(name = "sla_violations",
        indexes = {
                @Index(name = "idx_sla_violations_incident", columnList = "incident_id"),
                @Index(name = "idx_sla_violations_created_at", columnList = "created_at")},
        check = @CheckConstraint(name = "ck_sla_violations_type", constraint = "type IN ('RESPONSE', 'RESOLUTION')"))
public class SlaViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 10)
    private SlaClockType type;

    @Column(name = "overdue_seconds", nullable = false)
    private long overdueSeconds;

    /** The assignee when the deadline was missed; null if nobody was assigned. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_id")
    private User technician;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SlaViolation() {
    }

    private SlaViolation(Incident incident, SlaClockType type, long overdueSeconds, User technician, Instant now) {
        this.incident = incident;
        this.type = type;
        this.overdueSeconds = overdueSeconds;
        this.technician = technician;
        this.createdAt = now;
    }

    /** Records the violation an alert reports; only violation alerts are accepted. */
    public static SlaViolation of(Incident incident, SlaAlert alert, Instant now) {
        if (!alert.isViolation()) {
            throw new IllegalArgumentException("not a violation: " + alert.level());
        }
        return new SlaViolation(incident, alert.clock(), alert.overdueSeconds(), incident.getAssignee(), now);
    }

    public Long getId() {
        return id;
    }

    public Incident getIncident() {
        return incident;
    }

    public SlaClockType getType() {
        return type;
    }

    public long getOverdueSeconds() {
        return overdueSeconds;
    }

    public User getTechnician() {
        return technician;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
