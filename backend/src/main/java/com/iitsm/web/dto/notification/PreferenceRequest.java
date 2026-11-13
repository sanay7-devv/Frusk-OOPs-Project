package com.iitsm.web.dto.notification;

import com.iitsm.domain.notification.ChannelType;
import com.iitsm.domain.notification.NotificationEventType;

import jakarta.validation.constraints.NotNull;

/** One switch of the PUT /notifications/preferences body (API Data Dictionary C.7). */
public record PreferenceRequest(@NotNull NotificationEventType eventType, @NotNull ChannelType channel,
                                @NotNull Boolean enabled) {
}
