package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.iitsm.domain.sla.SlaTargets;
import com.iitsm.domain.sla.WorkCalendar;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * The SLA clocks of one incident, composed into it (handbook 2.5 M7): due times, pause bookkeeping, and the flags
 * that make each warning and violation fire exactly once.
 * <p>
 * Response clock: starts at creation, stops at ACKNOWLEDGED. Resolution clock: starts at creation, stops at
 * RESOLVED, pauses in PENDING_USER_INFO (the deadline moves later by the paused time) and restarts on REOPEN.
 */
@Embeddable
public class SlaTracker {

    @Column(name = "response_due")
    private Instant responseDue;

    @Column(name = "resolution_due")
    private Instant resolutionDue;

    @Column(name = "paused_at")
    private Instant pausedAt;

    @Column(name = "paused_seconds", nullable = false)
    private long pausedSeconds;

    @Column(name = "resp_violated", nullable = false)
    private boolean responseViolated;

    @Column(name = "res_violated", nullable = false)
    private boolean resolutionViolated;

    @Column(name = "resp_warn75_sent", nullable = false)
    private boolean responseFirstWarningSent;

    @Column(name = "resp_warn90_sent", nullable = false)
    private boolean responseSecondWarningSent;

    @Column(name = "res_warn75_sent", nullable = false)
    private boolean resolutionFirstWarningSent;

    @Column(name = "res_warn90_sent", nullable = false)
    private boolean resolutionSecondWarningSent;

    public Instant getResponseDue() {
        return responseDue;
    }

    public Instant getResolutionDue() {
        return resolutionDue;
    }

    public Instant getPausedAt() {
        return pausedAt;
    }

    public long getPausedSeconds() {
        return pausedSeconds;
    }

    public boolean isPaused() {
        return pausedAt != null;
    }

    public boolean isResponseViolated() {
        return responseViolated;
    }

    public boolean isResolutionViolated() {
        return resolutionViolated;
    }

    /** Sets both deadlines from the creation time once the priority (and so the SLA policy) is known. */
    void start(Instant createdAt, SlaTargets targets) {
        responseDue = targets.calendar().addWorkingTime(createdAt, targets.response());
        resolutionDue = targets.calendar().addWorkingTime(createdAt, targets.resolution());
    }

    /**
     * The priority changed: deadlines are recalculated from the original creation time (handbook 2.5 M5), keeping
     * any time already spent paused. A response clock that has already stopped is left alone.
     */
    void retarget(Instant createdAt, SlaTargets targets, boolean responseStopped) {
        WorkCalendar calendar = targets.calendar();
        if (!responseStopped) {
            Instant newDue = calendar.addWorkingTime(createdAt, targets.response());
            if (!newDue.equals(responseDue) && !responseViolated) {
                // a new deadline gets its own warnings (decision DEC-37)
                responseFirstWarningSent = false;
                responseSecondWarningSent = false;
            }
            responseDue = newDue;
        }
        Instant newDue = calendar.addWorkingTime(createdAt, targets.resolution().plusSeconds(pausedSeconds));
        if (!newDue.equals(resolutionDue) && !resolutionViolated) {
            resolutionFirstWarningSent = false;
            resolutionSecondWarningSent = false;
        }
        resolutionDue = newDue;
    }

    void pause(Instant now) {
        pausedAt = now;
    }

    /**
     * The clock resumes with the counted time it had left when it was paused, so the deadline moves later by exactly
     * the paused (counted) time. {@code pausedSeconds} adds up that counted time.
     */
    void resume(Instant now, WorkCalendar calendar) {
        if (pausedAt == null) {
            return;
        }
        long paused = calendar.workingTimeBetween(pausedAt, now).toSeconds();
        pausedSeconds += paused;
        if (resolutionDue != null) {
            // counting the paused time forward from the old deadline leaves the same counted time after `now`
            resolutionDue = calendar.addWorkingTime(resolutionDue, Duration.ofSeconds(paused));
        }
        pausedAt = null;
    }

    /** Reopen: a fresh resolution clock with the full target, and fresh warnings for it. */
    void restartResolution(Instant now, SlaTargets targets) {
        resolutionDue = targets.calendar().addWorkingTime(now, targets.resolution());
        resolutionViolated = false;
        resolutionFirstWarningSent = false;
        resolutionSecondWarningSent = false;
    }

    /**
     * One run of the SLA monitor over this incident (handbook 1.7, 2.5 M7). For each open clock: the first warning
     * at {@code firstPercent} of the deadline, the second at {@code secondPercent}, a violation once the deadline has
     * passed. Every flag is set when its alert fires, so an alert fires exactly once however often the monitor runs
     * or restarts. If a run finds a clock past several thresholds at once, only the highest alert fires and the
     * lower ones are marked as sent (no burst of stale warnings). A paused resolution clock raises nothing.
     *
     * @return the alerts that fired now, possibly none
     */
    List<SlaAlert> check(Instant now, boolean responseOpen, boolean resolutionOpen, SlaTargets targets,
                         int firstPercent, int secondPercent) {
        List<SlaAlert> alerts = new ArrayList<>(2);
        WorkCalendar calendar = targets.calendar();
        if (responseOpen && responseDue != null && !responseViolated) {
            SlaAlert.Level level = levelReached(now, responseDue, targets.response(), calendar, firstPercent,
                    secondPercent, responseFirstWarningSent, responseSecondWarningSent);
            if (level != null) {
                responseFirstWarningSent = true;
                responseSecondWarningSent |= level != SlaAlert.Level.FIRST_WARNING;
                responseViolated = level == SlaAlert.Level.VIOLATION;
                alerts.add(SlaAlert.of(SlaClockType.RESPONSE, level, now, responseDue, targets.response(), calendar));
            }
        }
        if (resolutionOpen && resolutionDue != null && !resolutionViolated && !isPaused()) {
            SlaAlert.Level level = levelReached(now, resolutionDue, targets.resolution(), calendar, firstPercent,
                    secondPercent, resolutionFirstWarningSent, resolutionSecondWarningSent);
            if (level != null) {
                resolutionFirstWarningSent = true;
                resolutionSecondWarningSent |= level != SlaAlert.Level.FIRST_WARNING;
                resolutionViolated = level == SlaAlert.Level.VIOLATION;
                alerts.add(SlaAlert.of(SlaClockType.RESOLUTION, level, now, resolutionDue, targets.resolution(),
                        calendar));
            }
        }
        return alerts;
    }

    /** The highest alert this clock has reached and not yet raised, or null. */
    private static SlaAlert.Level levelReached(Instant now, Instant due, Duration target, WorkCalendar calendar,
                                               int firstPercent, int secondPercent, boolean firstSent,
                                               boolean secondSent) {
        if (!now.isBefore(due)) {
            return SlaAlert.Level.VIOLATION;
        }
        double elapsed = elapsedPercent(now, due, target, calendar);
        if (elapsed >= secondPercent && !secondSent) {
            return SlaAlert.Level.SECOND_WARNING;
        }
        if (elapsed >= firstPercent && !firstSent && !secondSent) {
            return SlaAlert.Level.FIRST_WARNING;
        }
        return null;
    }

    /**
     * The SLA state shown in lists and on the detail page. WARNING starts at the first warning percentage of either
     * open clock. AT_RISK comes from the SLA risk score (module M12) and is not decided here.
     *
     * @param targets the policy's targets, or null if no policy applies any more (warnings are then not shown)
     */
    public SlaState stateAt(Instant now, IncidentStatus status, Instant acknowledgedAt, Instant resolvedAt,
                            SlaTargets targets, int firstWarningPercent) {
        if (resolutionDue == null) {
            return SlaState.OK; // no priority yet
        }
        if (status.isResolvedOrLater()) {
            boolean metResolution = resolvedAt != null && !resolvedAt.isAfter(resolutionDue) && !resolutionViolated;
            return metResolution && !responseViolated ? SlaState.MET : SlaState.VIOLATED;
        }
        if (isPaused()) {
            return SlaState.PAUSED;
        }
        boolean responseOpen = acknowledgedAt == null;
        if (responseViolated || resolutionViolated || now.isAfter(resolutionDue)
                || (responseOpen && now.isAfter(responseDue))) {
            return SlaState.VIOLATED;
        }
        if (targets == null) {
            return SlaState.OK;
        }
        WorkCalendar calendar = targets.calendar();
        boolean warning = elapsedPercent(now, resolutionDue, targets.resolution(), calendar) >= firstWarningPercent
                || (responseOpen && elapsedPercent(now, responseDue, targets.response(), calendar)
                >= firstWarningPercent);
        return warning ? SlaState.WARNING : SlaState.OK;
    }

    /** How much of a clock has run, in percent: 100 - remaining counted time / target. */
    static double elapsedPercent(Instant now, Instant due, Duration target, WorkCalendar calendar) {
        if (target == null || target.isZero()) {
            return 0;
        }
        double remaining = calendar.workingTimeBetween(now, due).toSeconds();
        return 100.0 * (1 - remaining / target.toSeconds());
    }
}
