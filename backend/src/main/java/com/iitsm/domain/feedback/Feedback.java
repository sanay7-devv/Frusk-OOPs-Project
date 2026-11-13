package com.iitsm.domain.feedback;

import java.time.Instant;

import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.incident.Incident;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

/**
 * The reporter's rating of a resolved incident (table feedback, handbook Appendix A.4): one row per incident, the
 * incident id is the primary key, so a second rating is impossible at the database level too.
 */
@Entity
@Table(name = "feedback",
        check = @CheckConstraint(name = "ck_feedback_rating", constraint = "rating BETWEEN 1 AND 5"))
public class Feedback {

    public static final int MAX_COMMENT_LENGTH = 1000;

    @Id
    @Column(name = "incident_id")
    private Long incidentId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @Column(name = "rating", nullable = false)
    private short rating;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Feedback() {
    }

    /** Validates itself: a rating outside 1 to 5 or a comment over 1000 characters cannot exist. */
    public Feedback(Incident incident, int rating, String comment, Instant now) {
        if (rating < 1 || rating > 5) {
            throw new InputValidationException("rating", "must be between 1 and 5");
        }
        String text = comment == null || comment.isBlank() ? null : comment.strip();
        if (text != null && text.length() > MAX_COMMENT_LENGTH) {
            throw new InputValidationException("comment", "must be at most " + MAX_COMMENT_LENGTH + " characters");
        }
        this.incident = incident;
        this.rating = (short) rating;
        this.comment = text;
        this.createdAt = now;
    }

    public Long getIncidentId() {
        return incidentId;
    }

    public int getRating() {
        return rating;
    }

    public String getComment() {
        return comment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
