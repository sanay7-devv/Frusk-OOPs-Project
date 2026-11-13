package com.iitsm.application.notification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.InputValidationException.FieldIssue;
import com.iitsm.domain.exception.ResourceNotFoundException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.notification.ChannelType;
import com.iitsm.domain.notification.Notification;
import com.iitsm.domain.notification.NotificationEventType;
import com.iitsm.domain.notification.NotificationPreference;
import com.iitsm.domain.notification.NotificationRules;
import com.iitsm.domain.repository.NotificationPreferenceRepository;
import com.iitsm.domain.repository.NotificationRepository;
import com.iitsm.domain.repository.PageSlice;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.User;

/**
 * What a person does with their own notifications: read the inbox, mark as read, and set preferences (handbook B.4,
 * decision DEC-40). Everything is scoped to the caller; there is no way to see or touch someone else's rows.
 */
@Service
public class NotificationService {

    /** A notification as the API shows it (API Data Dictionary C.7). */
    public record NotificationView(Long id, NotificationEventType eventType, String title, String message,
                                   Long incidentId, ChannelType channel, boolean read, Instant createdAt) {

        static NotificationView of(Notification n) {
            return new NotificationView(n.getId(), n.getEventType(), n.getTitle(), n.getMessage(),
                    n.getIncident() == null ? null : n.getIncident().getId(), n.getChannel(), n.isRead(),
                    n.getCreatedAt());
        }
    }

    public record UnreadCount(long count) {
    }

    /**
     * One switch. {@code locked} is true when it cannot be turned off (the inbox, and the critical alerts of this
     * person); a locked switch always reads {@code enabled = true}.
     */
    public record PreferenceView(NotificationEventType eventType, ChannelType channel, boolean enabled,
                                 boolean locked) {
    }

    /** One switch as the caller sends it. */
    public record PreferenceChange(NotificationEventType eventType, ChannelType channel, boolean enabled) {
    }

    private final NotificationRepository notifications;
    private final NotificationPreferenceRepository preferences;
    private final UserRepository users;

    public NotificationService(NotificationRepository notifications, NotificationPreferenceRepository preferences,
                               UserRepository users) {
        this.notifications = notifications;
        this.preferences = preferences;
        this.users = users;
    }

    /** The caller's notifications of one channel (the inbox unless asked otherwise), newest first. */
    @Transactional(readOnly = true)
    public PageSlice<NotificationView> list(AuthenticatedUser caller, Boolean unread, ChannelType channel,
                                            int page, int size) {
        ChannelType which = channel == null ? ChannelType.IN_APP : requireStored(channel);
        return notifications.findPage(caller.id(), which, Boolean.TRUE.equals(unread), page, size)
                .map(NotificationView::of);
    }

    @Transactional(readOnly = true)
    public UnreadCount unreadCount(AuthenticatedUser caller) {
        return new UnreadCount(notifications.countUnread(caller.id(), ChannelType.IN_APP));
    }

    /** Marks one of the caller's notifications read; someone else's is 404, as if it did not exist. */
    @Transactional
    public void markRead(AuthenticatedUser caller, Long id) {
        Notification notification = notifications.findByIdAndUser(id, caller.id())
                .orElseThrow(() -> new ResourceNotFoundException("Notification", id));
        notification.markRead();
    }

    @Transactional
    public void markAllRead(AuthenticatedUser caller) {
        notifications.markAllRead(caller.id(), ChannelType.IN_APP);
    }

    // ------------------------------------------------------------------ preferences

    /** Every event type on every per-user channel (15 x 4), with the person's current switch and whether it is locked. */
    @Transactional(readOnly = true)
    public List<PreferenceView> preferences(AuthenticatedUser caller) {
        return matrix(loadUser(caller), saved(caller.id()));
    }

    /**
     * Replaces the caller's switches with the given ones; anything not mentioned goes back to "on". A switch that
     * cannot be turned off (inbox, critical alerts) or a channel that is not a personal one is refused with
     * VALIDATION_FAILED, naming the entry.
     */
    @Transactional
    public List<PreferenceView> replacePreferences(AuthenticatedUser caller, List<PreferenceChange> changes) {
        User user = loadUser(caller);
        List<FieldIssue> issues = new ArrayList<>();
        Map<String, PreferenceChange> unique = new HashMap<>();
        for (int i = 0; i < changes.size(); i++) {
            PreferenceChange change = changes.get(i);
            String field = "[" + i + "]";
            if (!change.channel().isPerUser()) {
                issues.add(new FieldIssue(field + ".channel", change.channel() + " is not a personal channel"));
            } else if (!change.enabled()
                    && NotificationRules.cannotSwitchOff(user, change.eventType(), change.channel())) {
                issues.add(new FieldIssue(field + ".enabled", change.channel() + " for " + change.eventType()
                        + " cannot be switched off"));
            }
            unique.put(change.eventType() + "/" + change.channel(), change);
        }
        if (!issues.isEmpty()) {
            throw new InputValidationException("Some notification preferences are invalid.", issues);
        }
        List<NotificationPreference> rows = unique.values().stream()
                .map(c -> new NotificationPreference(user, c.eventType(), c.channel(), c.enabled()))
                .toList();
        preferences.replaceAll(user.getId(), rows);
        return matrix(user, rows);
    }

    private List<PreferenceView> matrix(User user, List<NotificationPreference> saved) {
        Map<String, Boolean> switches = new HashMap<>();
        saved.forEach(p -> switches.put(p.getEventType() + "/" + p.getChannel(), p.isEnabled()));
        List<PreferenceView> view = new ArrayList<>();
        for (NotificationEventType type : NotificationEventType.values()) {
            for (ChannelType channel : ChannelType.values()) {
                if (!channel.isPerUser()) {
                    continue;
                }
                boolean locked = NotificationRules.cannotSwitchOff(user, type, channel);
                boolean enabled = locked || switches.getOrDefault(type + "/" + channel, true);
                view.add(new PreferenceView(type, channel, enabled, locked));
            }
        }
        return view;
    }

    private List<NotificationPreference> saved(Long userId) {
        return preferences.findByUser(userId);
    }

    private User loadUser(AuthenticatedUser caller) {
        return users.findById(caller.id()).orElseThrow(() -> new UserNotFoundException(caller.id()));
    }

    private static ChannelType requireStored(ChannelType channel) {
        if (!channel.isStored()) {
            throw new InputValidationException("channel", channel + " is delivered, not stored; use IN_APP or SMS_SIM");
        }
        return channel;
    }
}
