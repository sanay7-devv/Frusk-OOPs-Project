package com.iitsm.domain.audit;

import java.time.Instant;

import org.hibernate.annotations.Immutable;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.user.User;

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
 * One entry of the append-only audit trail (table audit_records, handbook Appendix A.4): when, who (null = the
 * system), what, on which incident, and the status before and after. Immutable: no setters, Hibernate never issues
 * an UPDATE for it, and the repository has no update or delete method.
 */
@Entity
@Immutable
@Table(name = "audit_records", indexes = {
        @Index(name = "idx_audit_records_incident_created", columnList = "incident_id, created_at"),
        @Index(name = "idx_audit_records_actor", columnList = "actor_id")})
public class AuditRecord {

    /**
     * Descriptions of entries hidden from reporters start with this (decision DEC-38). Only {@link #internal} writes
     * it; {@link #of} refuses a description that starts with it, so a public text can never turn internal by accident.
     */
    private static final String INTERNAL_PREFIX = "Internal note";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 40)
    private AuditAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_state", length = 20)
    private IncidentStatus previousState;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_state", length = 20)
    private IncidentStatus newState;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AuditRecord() {
    }

    /** An entry every participant may read. */
    public static AuditRecord of(Incident incident, User actor, AuditAction action, IncidentStatus previousState,
                                 IncidentStatus newState, String description, Instant createdAt) {
        if (description.startsWith(INTERNAL_PREFIX)) {
            throw new IllegalArgumentException("Internal entries are created with AuditRecord.internal");
        }
        return new AuditRecord(incident, actor, action, previousState, newState, description, createdAt);
    }

    /**
     * An entry hidden from reporters without staff rights: the only way to create one (decision DEC-46, C3). The
     * description gets the internal marker in front, for example "added by Ravi" becomes "Internal note added by
     * Ravi"; {@link #isInternal} reads it back.
     */
    public static AuditRecord internal(Incident incident, User actor, AuditAction action,
                                       IncidentStatus previousState, IncidentStatus newState, String text,
                                       Instant createdAt) {
        return new AuditRecord(incident, actor, action, previousState, newState, INTERNAL_PREFIX + " " + text,
                createdAt);
    }

    private AuditRecord(Incident incident, User actor, AuditAction action, IncidentStatus previousState,
                        IncidentStatus newState, String description, Instant createdAt) {
        this.incident = incident;
        this.actor = actor;
        this.action = action;
        this.previousState = previousState;
        this.newState = newState;
        this.description = description;
        this.createdAt = createdAt;
    }

    /** Entries a reporter without staff rights does not see in an incident's history. */
    public boolean isInternal() {
        return description.startsWith(INTERNAL_PREFIX);
    }

    public Long getId() {
        return id;
    }

    public Incident getIncident() {
        return incident;
    }

    public User getActor() {
        return actor;
    }

    public AuditAction getAction() {
        return action;
    }

    public IncidentStatus getPreviousState() {
        return previousState;
    }

    public IncidentStatus getNewState() {
        return newState;
    }

    public String getDescription() {
        return description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
