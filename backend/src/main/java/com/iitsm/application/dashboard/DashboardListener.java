package com.iitsm.application.dashboard;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.iitsm.domain.event.IncidentChanged;
import com.iitsm.domain.event.SlaViolated;
import com.iitsm.domain.event.SlaWarning;
import com.iitsm.domain.event.TriageNeeded;
import com.iitsm.domain.notification.NotificationEventType;

/**
 * Observer: the live dashboard's listener (handbook 2.5 M13 and 2.6). Every method runs <b>after the publisher's
 * transaction commits</b>, so the dashboard never shows a change that was rolled back, and on its own single thread
 * ({@code dashboardExecutor}), so a slow socket never delays the request and events keep their order. It reads the
 * incident's current code, priority and status and pushes a {@code DashboardEvent} to {@code /topic/dashboard}; the
 * counters follow within a second (DEC-81). A failure is logged and goes no further.
 * <p>
 * The same events also reach the audit and notification listeners: this class only adds one more Observer.
 */
@Component
public class DashboardListener {

    private static final Logger log = LoggerFactory.getLogger(DashboardListener.class);

    private final DashboardService dashboard;

    public DashboardListener(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @Async("dashboardExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(IncidentChanged event) {
        DashboardService.typeOf(event.action())
                .ifPresent(type -> push(type, event.incidentId(), event.occurredAt()));
    }

    @Async("dashboardExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(TriageNeeded event) {
        push(NotificationEventType.TRIAGE_NEEDED, event.incidentId(), event.occurredAt());
    }

    @Async("dashboardExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(SlaWarning event) {
        push(NotificationEventType.SLA_WARNING, event.incidentId(), event.occurredAt());
    }

    @Async("dashboardExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(SlaViolated event) {
        push(NotificationEventType.SLA_VIOLATED, event.incidentId(), event.occurredAt());
    }

    private void push(NotificationEventType type, Long incidentId, Instant at) {
        try {
            dashboard.eventFor(type, incidentId, at).ifPresent(dashboard::push);
        } catch (RuntimeException ex) {
            log.error("Could not push {} of incident {} to the dashboard", type, incidentId, ex);
        }
    }
}
