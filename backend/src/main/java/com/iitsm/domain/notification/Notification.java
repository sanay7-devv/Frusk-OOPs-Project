package com.iitsm.domain.notification;

import java.time.Instant;

import org.hibernate.annotations.ColumnDefault;

import com.iitsm.domain.incident.Incident;
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
 * One stored notification (table notifications, handbook Appendix A.4): a row in a person's inbox
 * ({@link ChannelType#IN_APP}) or a simulated text message ({@link ChannelType#SMS_SIM}). Email, WebSocket and chat
 * deliveries leave no row: the table has no status or retry columns, and the inbox row is the durable record
 * (decision DEC-42).
 */
@Entity
@Table(name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_user_created", columnList = "user_id, created_at"),
                @Index(name = "idx_notifications_user_read", columnList = "user_id, read")},
        check = @CheckConstraint(name = "ck_notifications_channel",
                constraint = "channel IN ('IN_APP', 'EMAIL', 'WEBSOCKET', 'SMS_SIM')"))
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private NotificationEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 12)
    private ChannelType channel;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "text")
    private String message;

    /** The incident this is about; null for a digest that covers several incidents. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id")
    private Incident incident;

    /** Column "read" of the contract; named differently here because read is awkward in a query. */
    @ColumnDefault("false")
    @Column(name = "read", nullable = false)
    private boolean seen;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Notification() {
    }

    public Notification(User user, NotificationEventType eventType, ChannelType channel, String title,
                        String message, Incident incident, Instant createdAt) {
        if (!channel.isStored()) {
            throw new IllegalArgumentException("Channel " + channel + " does not store notifications");
        }
        this.user = user;
        this.eventType = eventType;
        this.channel = channel;
        this.title = title;
        this.message = message;
        this.incident = incident;
        this.createdAt = createdAt;
    }

    public void markRead() {
        this.seen = true;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public NotificationEventType getEventType() {
        return eventType;
    }

    public ChannelType getChannel() {
        return channel;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public Incident getIncident() {
        return incident;
    }

    public boolean isRead() {
        return seen;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
