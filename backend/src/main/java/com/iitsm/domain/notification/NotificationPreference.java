package com.iitsm.domain.notification;

import java.io.Serializable;
import java.util.Objects;

import com.iitsm.domain.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

/**
 * One switch of a person's notification settings (table notification_preferences, handbook Appendix A.4): may this
 * event reach me through this channel? The primary key is all three of user, event type and channel. A missing row
 * means "on". Which switches cannot be turned off is decided by {@link NotificationRules}.
 */
@Entity
@Table(name = "notification_preferences")
public class NotificationPreference {

    @EmbeddedId
    private Key id;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    protected NotificationPreference() {
    }

    public NotificationPreference(User user, NotificationEventType eventType, ChannelType channel, boolean enabled) {
        this.id = new Key(user.getId(), eventType, channel);
        this.user = user;
        this.enabled = enabled;
    }

    public NotificationEventType getEventType() {
        return id.eventType;
    }

    public ChannelType getChannel() {
        return id.channel;
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** The composite primary key. */
    @Embeddable
    public static class Key implements Serializable {

        @Column(name = "user_id")
        private Long userId;

        @Enumerated(EnumType.STRING)
        @Column(name = "event_type", length = 30)
        private NotificationEventType eventType;

        @Enumerated(EnumType.STRING)
        @Column(name = "channel", length = 12)
        private ChannelType channel;

        protected Key() {
        }

        public Key(Long userId, NotificationEventType eventType, ChannelType channel) {
            this.userId = userId;
            this.eventType = eventType;
            this.channel = channel;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Key other && Objects.equals(userId, other.userId)
                    && eventType == other.eventType && channel == other.channel;
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, eventType, channel);
        }
    }
}
