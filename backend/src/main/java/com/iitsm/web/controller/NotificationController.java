package com.iitsm.web.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.notification.NotificationService;
import com.iitsm.application.notification.PushDeviceService;
import com.iitsm.application.notification.NotificationService.NotificationView;
import com.iitsm.application.notification.NotificationService.PreferenceChange;
import com.iitsm.application.notification.NotificationService.PreferenceView;
import com.iitsm.application.notification.NotificationService.UnreadCount;
import com.iitsm.domain.notification.ChannelType;
import com.iitsm.web.dto.PageResponse;
import com.iitsm.web.dto.notification.PreferenceRequest;
import com.iitsm.web.dto.notification.RegisterDeviceRequest;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * The caller's own notifications (contract B.4). Any logged-in user; every operation is scoped to the caller, so
 * there is nothing to guard beyond the login. The same notifications are pushed live to /user/queue/notifications.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService notifications;
    private final PushDeviceService pushDevices;

    public NotificationController(NotificationService notifications, PushDeviceService pushDevices) {
        this.notifications = notifications;
        this.pushDevices = pushDevices;
    }

    @GetMapping
    @Operation(summary = "My notifications, newest first (the inbox unless channel=SMS_SIM is asked for)")
    public PageResponse<NotificationView> list(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestParam(required = false) Boolean unread,
            @RequestParam(required = false) ChannelType channel,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return PageResponse.of(notifications.list(caller, unread, channel, page, size));
    }

    @GetMapping("/devices")
    @Operation(summary = "My registered push devices (the token is shown only as its last six characters)")
    public List<PushDeviceService.DeviceView> devices(@AuthenticationPrincipal AuthenticatedUser caller) {
        return pushDevices.list(caller);
    }

    @PostMapping("/devices")
    @Operation(summary = "Register a device for push notifications: 201 for a new one, 200 when it was already registered")
    public ResponseEntity<PushDeviceService.DeviceView> registerDevice(@AuthenticationPrincipal AuthenticatedUser caller,
                                                                       @Valid @RequestBody RegisterDeviceRequest request) {
        PushDeviceService.Registration registration = pushDevices.register(caller, request.token(), request.platform());
        return ResponseEntity.status(registration.created() ? HttpStatus.CREATED : HttpStatus.OK).body(registration.device());
    }

    @DeleteMapping("/devices/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Stop pushing to one of my devices")
    @ApiErrors({ErrorCode.NOT_FOUND})
    public void removeDevice(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        pushDevices.remove(caller, id);
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Number of unread inbox notifications")
    public UnreadCount unreadCount(@AuthenticationPrincipal AuthenticatedUser caller) {
        return notifications.unreadCount(caller);
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark one of my notifications read")
    @ApiErrors({ErrorCode.NOT_FOUND})
    public void markRead(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        notifications.markRead(caller, id);
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark all my inbox notifications read")
    public void markAllRead(@AuthenticationPrincipal AuthenticatedUser caller) {
        notifications.markAllRead(caller);
    }

    @GetMapping("/preferences")
    @Operation(summary = "My notification switches: every event type on every personal channel, with locked ones marked")
    public List<PreferenceView> preferences(@AuthenticationPrincipal AuthenticatedUser caller) {
        return notifications.preferences(caller);
    }

    @PutMapping("/preferences")
    @Operation(summary = "Replace my notification switches; the inbox and critical alerts cannot be turned off")
    public List<PreferenceView> replacePreferences(@AuthenticationPrincipal AuthenticatedUser caller,
                                                   @RequestBody List<@Valid PreferenceRequest> body) {
        return notifications.replacePreferences(caller, body.stream()
                .map(p -> new PreferenceChange(p.eventType(), p.channel(), p.enabled()))
                .toList());
    }
}
