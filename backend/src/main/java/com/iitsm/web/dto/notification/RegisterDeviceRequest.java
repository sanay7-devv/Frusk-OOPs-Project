package com.iitsm.web.dto.notification;

import com.iitsm.domain.notification.PushDevice;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** POST /notifications/devices: the push provider's token for this device and what kind of device it is. */
public record RegisterDeviceRequest(@NotBlank @Size(min = 8, max = 255) String token,
                                    @NotNull PushDevice.Platform platform) {
}
