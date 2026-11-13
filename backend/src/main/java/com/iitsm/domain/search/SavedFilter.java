package com.iitsm.domain.search;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A named set of incident-list filters a user saved to reuse (table saved_filters, handbook Appendix A.4). The
 * filters are kept as JSON exactly as the list endpoint takes them (status, priority, slaState, ...), so the
 * frontend can send them straight back. Private to its owner.
 */
@Entity
@Table(name = "saved_filters", indexes = @Index(name = "idx_saved_filters_user", columnList = "user_id"))
public class SavedFilter {

    public static final int MAX_NAME_LENGTH = 60;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "name", nullable = false, length = MAX_NAME_LENGTH)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "filter_json", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> filter = new LinkedHashMap<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SavedFilter() {
    }

    public SavedFilter(User user, String name, Map<String, Object> filter, Instant now) {
        String trimmed = name == null ? "" : name.strip();
        if (trimmed.isEmpty() || trimmed.length() > MAX_NAME_LENGTH) {
            throw new InputValidationException("name", "must be between 1 and " + MAX_NAME_LENGTH + " characters");
        }
        this.user = user;
        this.name = trimmed;
        this.filter = new LinkedHashMap<>(filter);
        this.createdAt = now;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getName() {
        return name;
    }

    public Map<String, Object> getFilter() {
        return Map.copyOf(filter);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
