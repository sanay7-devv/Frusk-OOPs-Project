package com.iitsm.domain.incident;

import java.time.Instant;

import com.iitsm.domain.exception.InputValidationException;
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
 * A note on an incident (table incident_comments): investigation notes, the technician's questions and the
 * reporter's answers. INTERNAL notes are only for technicians and admins.
 */
@Entity
@Table(name = "incident_comments", indexes = @Index(name = "idx_incident_comments_incident", columnList = "incident_id"))
public class IncidentComment {

    public static final int MAX_LENGTH = 4000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 10)
    private CommentVisibility visibility;

    @Column(name = "body", nullable = false, columnDefinition = "text")
    private String body;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected IncidentComment() {
    }

    public IncidentComment(Incident incident, User author, CommentVisibility visibility, String body, Instant now) {
        if (body == null || body.isBlank() || body.length() > MAX_LENGTH) {
            throw new InputValidationException("body", "must be between 1 and " + MAX_LENGTH + " characters");
        }
        this.incident = incident;
        this.author = author;
        this.visibility = visibility;
        this.body = body.strip();
        this.createdAt = now;
    }

    public Long getId() {
        return id;
    }

    public Incident getIncident() {
        return incident;
    }

    public User getAuthor() {
        return author;
    }

    public CommentVisibility getVisibility() {
        return visibility;
    }

    public String getBody() {
        return body;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
