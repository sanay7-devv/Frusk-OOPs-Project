package com.iitsm.domain.repository;

import java.util.Collection;
import java.util.List;

import com.iitsm.domain.notification.NotificationPreference;

/** Repository pattern: the per-user notification switches. A missing row means "on". */
public interface NotificationPreferenceRepository {

    List<NotificationPreference> findByUser(Long userId);

    /** Replaces everything the person saved with these switches. */
    void replaceAll(Long userId, Collection<NotificationPreference> preferences);
}
