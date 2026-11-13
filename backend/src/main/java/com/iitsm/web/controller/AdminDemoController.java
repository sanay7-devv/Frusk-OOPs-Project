package com.iitsm.web.controller;

import java.time.Duration;
import java.time.Instant;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.demo.AdjustableClock;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.event.SecurityAuditEvent;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Demo aids for the recorded demo (D1, DEC-45): move the clock forward so timers pass in seconds. The controller only
 * exists in the {@code demo} profile (and the adjustable clock bean with it), so in every other profile these
 * paths are plain 404s. Needs CONFIG_MANAGE (administrators). Every advance is written to the audit trail.
 * <p>
 * The access token is checked against the same clock, so after a large advance the next call may answer
 * TOKEN_EXPIRED; refreshing the token (which is valid for 7 days) continues the demo.
 */
@RestController
@Profile("demo")
@RequestMapping("/api/v1/admin/demo")
@PreAuthorize("hasAuthority('CONFIG_MANAGE')")
@Tag(name = "Admin: demo clock")
public class AdminDemoController {

    public record AdvanceRequest(@NotNull @Min(1) @Max(1440) Integer minutes) {
    }

    public record ClockView(Instant now, long offsetMinutes) {
    }

    private final AdjustableClock clock;
    private final ApplicationEventPublisher events;

    public AdminDemoController(AdjustableClock clock, ApplicationEventPublisher events) {
        this.clock = clock;
        this.events = events;
    }

    @GetMapping("/clock")
    @Operation(summary = "The demo clock: the time the application sees and how far it is ahead of real time")
    public ClockView clock() {
        return view();
    }

    @PostMapping("/clock/advance")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Move the demo clock forward by 1 to 1440 minutes (never backwards)")
    public ClockView advance(@AuthenticationPrincipal AuthenticatedUser caller,
                             @Valid @RequestBody AdvanceRequest request) {
        Duration offset = clock.advance(Duration.ofMinutes(request.minutes()));
        events.publishEvent(new SecurityAuditEvent(AuditAction.CONFIG_CHANGED, caller.id(),
                "Demo clock advanced by " + request.minutes() + " min (now " + offset.toMinutes()
                        + " min ahead of real time)", clock.instant()));
        return view();
    }

    private ClockView view() {
        return new ClockView(clock.instant(), clock.offset().toMinutes());
    }
}
