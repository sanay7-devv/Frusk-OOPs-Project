package com.iitsm.domain.problem;

import java.time.Instant;

import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.service.ItService;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Groups incidents that are one underlying problem (table problem_records, handbook Appendix A.3): the same failure
 * reported several times, or an outage seen on a service and on the services that depend on it. The incidents point
 * to it with {@code incidents.problem_id}. The lead incident (highest priority, then earliest, decision DEC-46 G5)
 * is not stored: it is derived from the linked incidents, so it can never disagree with them.
 */
@Entity
@Table(name = "problem_records")
public class ProblemRecord {

    public static final int MAX_TITLE_LENGTH = 200;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = MAX_TITLE_LENGTH)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ItService service;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private ProblemStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ProblemRecord() {
    }

    /** A new problem record is always OPEN. */
    public ProblemRecord(String title, ItService service, Instant now) {
        if (title == null || title.isBlank()) {
            throw new InputValidationException("title", "is required");
        }
        this.title = title.strip().length() > MAX_TITLE_LENGTH
                ? title.strip().substring(0, MAX_TITLE_LENGTH) : title.strip();
        this.service = service;
        this.status = ProblemStatus.OPEN;
        this.createdAt = now;
    }

    public boolean isOpen() {
        return status == ProblemStatus.OPEN;
    }

    public void resolve() {
        status = ProblemStatus.RESOLVED;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public ItService getService() {
        return service;
    }

    public ProblemStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
