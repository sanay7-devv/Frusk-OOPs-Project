package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;

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
    void start(Instant createdAt, Duration responseTarget, Duration resolutionTarget) {
        responseDue = createdAt.plus(responseTarget);
        resolutionDue = createdAt.plus(resolutionTarget);
    }

    /**
     * The priority changed: deadlines are recalculated from the original creation time (handbook 2.5 M5), keeping
     * any time already spent paused. A response clock that has already stopped is left alone.
     */
    void retarget(Instant createdAt, Duration responseTarget, Duration resolutionTarget, boolean responseStopped) {
        if (!responseStopped) {
            responseDue = createdAt.plus(responseTarget);
        }
        resolutionDue = createdAt.plus(resolutionTarget).plusSeconds(pausedSeconds);
    }

    void pause(Instant now) {
        pausedAt = now;
    }

    /** Adds the paused time to the total and pushes the resolution deadline later by exactly that much. */
    void resume(Instant now) {
        if (pausedAt == null) {
            return;
        }
        long seconds = Duration.between(pausedAt, now).toSeconds();
        pausedSeconds += seconds;
        if (resolutionDue != null) {
            resolutionDue = resolutionDue.plusSeconds(seconds);
        }
        pausedAt = null;
    }

    /** Reopen: a fresh resolution clock with the full target, and fresh warnings for it. */
    void restartResolution(Instant now, Duration resolutionTarget) {
        resolutionDue = now.plus(resolutionTarget);
        resolutionViolated = false;
        resolutionFirstWarningSent = false;
        resolutionSecondWarningSent = false;
    }

    /**
     * The SLA state shown in lists and on the detail page. WARNING starts at the first warning percentage of either
     * open clock. AT_RISK comes from the SLA risk score (module M12) and is not decided here.
     */
    public SlaState stateAt(Instant now, IncidentStatus status, Instant acknowledgedAt, Instant resolvedAt,
                            Duration responseTarget, Duration resolutionTarget, int firstWarningPercent) {
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
        boolean warning = elapsedPercent(now, resolutionDue, resolutionTarget) >= firstWarningPercent
                || (responseOpen && elapsedPercent(now, responseDue, responseTarget) >= firstWarningPercent);
        return warning ? SlaState.WARNING : SlaState.OK;
    }

    /** How much of a clock has run, in percent: 100 - remaining / target. */
    private static double elapsedPercent(Instant now, Instant due, Duration target) {
        if (target == null || target.isZero()) {
            return 0;
        }
        double remaining = Duration.between(now, due).toSeconds();
        return 100.0 * (1 - remaining / target.toSeconds());
    }
}
