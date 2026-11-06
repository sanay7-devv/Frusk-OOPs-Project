package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.iitsm.domain.category.Category;
import com.iitsm.domain.exception.InvalidStateTransitionException;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.priority.PriorityBreakdown;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.user.User;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
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
import jakarta.persistence.Version;

/**
 * One reported IT problem, tracked from creation to closure: the aggregate root of the incident domain
 * (handbook Appendix A.3).
 * <p>
 * <b>State pattern.</b> Every lifecycle method (assign, acknowledge, resolve, ...) is handed to the object for the
 * current status ({@link IncidentState}), which either performs the move or throws
 * InvalidStateTransitionException. Who may act is checked in the application layer; whether the move is legal is
 * decided here.
 * <p>
 * <b>Composition.</b> The incident owns its {@link SlaTracker} (deadlines and clocks) and its {@link Resolution}.
 * <b>Optimistic locking.</b> The version column makes two simultaneous updates produce exactly one conflict.
 * Build new incidents with {@link IncidentFactory}.
 */
@Entity
@Table(name = "incidents",
        indexes = {
                @Index(name = "idx_incidents_status", columnList = "status"),
                @Index(name = "idx_incidents_priority", columnList = "priority"),
                @Index(name = "idx_incidents_service", columnList = "service_id"),
                @Index(name = "idx_incidents_assignee", columnList = "assignee_id"),
                @Index(name = "idx_incidents_reporter", columnList = "reporter_id"),
                @Index(name = "idx_incidents_created_at", columnList = "created_at"),
                @Index(name = "idx_incidents_category", columnList = "category_id"),
                @Index(name = "idx_incidents_response_due", columnList = "response_due"),
                @Index(name = "idx_incidents_resolution_due", columnList = "resolution_due")},
        check = {
                @CheckConstraint(name = "ck_incidents_impact", constraint = "impact BETWEEN 1 AND 5"),
                @CheckConstraint(name = "ck_incidents_urgency", constraint = "urgency BETWEEN 1 AND 5"),
                @CheckConstraint(name = "ck_incidents_affected_users", constraint = "affected_users >= 1"),
                @CheckConstraint(name = "ck_incidents_escalation_level", constraint = "escalation_level BETWEEN 0 AND 3")})
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    /** Null while in triage (no category given and none suggested). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ItService service;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(name = "impact", nullable = false)
    private short impact;

    @Column(name = "urgency", nullable = false)
    private short urgency;

    @Column(name = "affected_users", nullable = false)
    private int affectedUsers;

    @Column(name = "priority_score")
    private Integer priorityScore;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "priority", length = 2)
    private Priority priority;

    /** "Why this priority", stored as JSONB. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "priority_breakdown", columnDefinition = "jsonb")
    private PriorityBreakdown priorityBreakdown;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IncidentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "closure_reason", length = 15)
    private ClosureReason closureReason;

    @Column(name = "major", nullable = false)
    private boolean major;

    @Column(name = "escalation_level", nullable = false)
    private short escalationLevel;

    /** Problem record grouping correlated incidents (module M12); plain id until that entity exists. */
    @Column(name = "problem_id")
    private Long problemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duplicate_of_id")
    private Incident duplicateOf;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Embedded
    private SlaTracker sla = new SlaTracker();

    @Column(name = "reopen_count", nullable = false)
    private int reopenCount;

    @Embedded
    private Resolution resolution = Resolution.none();

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected Incident() {
    }

    /** Only {@link IncidentFactory} creates incidents, so every new one is valid and starts in NEW. */
    Incident(String code, String title, String description, User reporter, ItService service, int impact,
             int urgency, int affectedUsers, Instant now) {
        this.code = code;
        this.title = title;
        this.description = description;
        this.reporter = reporter;
        this.service = service;
        this.impact = (short) impact;
        this.urgency = (short) urgency;
        this.affectedUsers = affectedUsers;
        this.status = IncidentStatus.NEW;
        this.createdAt = now;
        this.updatedAt = now;
    }

    private IncidentState state() {
        return StateFactory.of(status);
    }

    // ------------------------------------------------------------------ lifecycle (State pattern)

    /** NEW to CLASSIFIED. {@code category} may be null: the incident then waits in triage. */
    public void classify(Category newCategory, Instant now) {
        state().classify(this, newCategory, now);
    }

    public void assign(User technician, Instant now) {
        state().assign(this, technician, now);
    }

    public void acknowledge(Instant now) {
        state().acknowledge(this, now);
    }

    public void startWork(Instant now) {
        state().startWork(this, now);
    }

    public void requestInfo(String message, Instant now) {
        state().requestInfo(this, message, now);
    }

    public void provideInfo(String message, Instant now) {
        state().provideInfo(this, message, now);
    }

    public void resolve(Resolution newResolution, Instant now) {
        state().resolve(this, newResolution, now);
    }

    public void verify(Instant now) {
        state().verify(this, now);
    }

    public void close(ClosureReason reason, Instant now) {
        state().close(this, reason, now);
    }

    /**
     * @param reopenWindow     how long after closure a CLOSED incident may still be reopened (setting)
     * @param resolutionTarget the full resolution target of the incident's SLA, for the restarted clock
     */
    public void reopen(String reason, Instant now, Duration reopenWindow, Duration resolutionTarget) {
        state().reopen(this, reason, now, reopenWindow, resolutionTarget);
    }

    public void reassign(User technician, Instant now) {
        state().reassign(this, technician, now);
    }

    /** The transitions legal in the current status (who may perform them is checked separately). */
    public Set<IncidentAction> legalTransitions(Instant now, Duration reopenWindow) {
        return state().legalActions(this, now, reopenWindow);
    }

    // ------------------------------------------------------------------ changes outside the state machine

    /** PUT /incidents/{id}: allowed until the incident is resolved. Null values are left unchanged. */
    public void updateDetails(String newDescription, Integer newImpact, Integer newUrgency, Integer newAffectedUsers,
                              Instant now) {
        if (!status.isEditable()) {
            throw new InvalidStateTransitionException(status.name(), IncidentAction.EDIT.name());
        }
        if (newDescription != null) {
            description = newDescription;
        }
        if (newImpact != null) {
            impact = newImpact.shortValue();
        }
        if (newUrgency != null) {
            urgency = newUrgency.shortValue();
        }
        if (newAffectedUsers != null) {
            affectedUsers = newAffectedUsers;
        }
        touch(now);
    }

    /**
     * Sets or changes the priority and the SLA deadlines that follow from it. The first time, both clocks start
     * from the creation time; afterwards they are recalculated from the creation time (handbook 2.5 M5).
     */
    public void applyPriority(PriorityBreakdown breakdown, Duration responseTarget, Duration resolutionTarget,
                              Instant now) {
        if (status.isResolvedOrLater()) {
            throw new InvalidStateTransitionException(status.name(), IncidentAction.OVERRIDE_PRIORITY.name(),
                    "the priority of a resolved incident cannot change");
        }
        boolean firstTime = sla.getResolutionDue() == null;
        priorityBreakdown = breakdown;
        priorityScore = breakdown.score();
        priority = breakdown.band();
        major = priority == Priority.P1;
        if (firstTime) {
            sla.start(createdAt, responseTarget, resolutionTarget);
        } else {
            sla.retarget(createdAt, responseTarget, resolutionTarget, acknowledgedAt != null);
        }
        touch(now);
    }

    /**
     * Lets the SLA monitor check both clocks (handbook 2.5 M7). The response clock runs until the incident is
     * acknowledged, the resolution clock until it is resolved; the tracker decides which alerts fire.
     */
    public List<SlaAlert> checkSla(Instant now, Duration responseTarget, Duration resolutionTarget,
                                   int firstWarningPercent, int secondWarningPercent) {
        boolean done = status.isResolvedOrLater();
        return sla.check(now, !done && acknowledgedAt == null, !done, responseTarget, resolutionTarget,
                firstWarningPercent, secondWarningPercent);
    }

    public boolean isReportedBy(Long userId) {
        return reporter.getId().equals(userId);
    }

    public boolean isAssignedTo(Long userId) {
        return assignee != null && assignee.getId().equals(userId);
    }

    // ------------------------------------------------------------------ mutators used by the state classes

    void moveTo(IncidentStatus next, Instant now) {
        status = next;
        touch(now);
    }

    void setCategory(Category newCategory) {
        category = newCategory;
    }

    void setAssignee(User technician) {
        assignee = technician;
    }

    void markAcknowledged(Instant now) {
        acknowledgedAt = now;
    }

    void pauseSla(Instant now) {
        sla.pause(now);
    }

    void resumeSla(Instant now) {
        sla.resume(now);
    }

    void markResolved(Resolution newResolution, Instant now) {
        resolution = newResolution;
        resolvedAt = now;
    }

    void markClosed(ClosureReason reason, Instant now) {
        closureReason = reason;
        closedAt = now;
    }

    void markReopened(Instant now, Duration resolutionTarget) {
        reopenCount++;
        resolvedAt = null;
        closedAt = null;
        closureReason = null;
        sla.restartResolution(now, resolutionTarget);
    }

    private void touch(Instant now) {
        updatedAt = now;
    }

    // ------------------------------------------------------------------ getters

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public User getReporter() {
        return reporter;
    }

    public Category getCategory() {
        return category;
    }

    public ItService getService() {
        return service;
    }

    public User getAssignee() {
        return assignee;
    }

    public int getImpact() {
        return impact;
    }

    public int getUrgency() {
        return urgency;
    }

    public int getAffectedUsers() {
        return affectedUsers;
    }

    public Integer getPriorityScore() {
        return priorityScore;
    }

    public Priority getPriority() {
        return priority;
    }

    public PriorityBreakdown getPriorityBreakdown() {
        return priorityBreakdown;
    }

    public IncidentStatus getStatus() {
        return status;
    }

    public ClosureReason getClosureReason() {
        return closureReason;
    }

    public boolean isMajor() {
        return major;
    }

    public int getEscalationLevel() {
        return escalationLevel;
    }

    public Long getProblemId() {
        return problemId;
    }

    public Incident getDuplicateOf() {
        return duplicateOf;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getAcknowledgedAt() {
        return acknowledgedAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public SlaTracker getSla() {
        return sla;
    }

    public int getReopenCount() {
        return reopenCount;
    }

    /** Null until resolved. */
    public Resolution getResolution() {
        return resolution != null && resolution.isPresent() ? resolution : null;
    }

    public long getVersion() {
        return version;
    }

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof Incident other && id != null && id.equals(other.getId()));
    }

    @Override
    public int hashCode() {
        return Incident.class.hashCode();
    }
}
