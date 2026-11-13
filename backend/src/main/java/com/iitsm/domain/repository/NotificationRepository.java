package com.iitsm.domain.repository;

import java.util.Optional;

import com.iitsm.domain.notification.ChannelType;
import com.iitsm.domain.notification.Notification;

/** Repository pattern: storage of notifications (inbox rows and simulated text messages). */
public interface NotificationRepository {

    Notification save(Notification notification);

    /** One person's notification, or empty if it does not exist or belongs to someone else. */
    Optional<Notification> findByIdAndUser(Long id, Long userId);

    /** A person's notifications of one channel, newest first, with the incident loaded. */
    PageSlice<Notification> findPage(Long userId, ChannelType channel, boolean unreadOnly, int page, int size);

    long countUnread(Long userId, ChannelType channel);

    /** Marks every unread notification of the channel read; returns how many changed. */
    int markAllRead(Long userId, ChannelType channel);
}
