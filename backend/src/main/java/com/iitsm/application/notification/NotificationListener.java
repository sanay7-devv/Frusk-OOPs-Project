package com.iitsm.application.notification;

import java.util.List;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.iitsm.domain.event.EscalationExhausted;
import com.iitsm.domain.event.IncidentChanged;
import com.iitsm.domain.event.IncidentEscalated;
import com.iitsm.domain.event.SlaRunCompleted;
import com.iitsm.domain.event.SlaViolated;
import com.iitsm.domain.event.SlaWarning;
import com.iitsm.domain.event.TriageNeeded;

/**
 * Observer: turns incident events into notifications (handbook 2.5 M9).
 * <p>
 * Every method runs <b>after the publisher's transaction commits</b> and <b>on its own thread</b>, so a slow or
 * broken mail server can never roll back or delay an incident (the audit listener is the opposite on purpose: it runs
 * inside the transaction). A single worker thread keeps the order of events, which the digest of a monitor run needs:
 * its warnings arrive before the "run completed" event. Whatever goes wrong is logged here and goes no further.
 */
@Component
public class NotificationListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationListener.class);

    private final NotificationPlanner planner;
    private final NotificationDispatcher dispatcher;

    public NotificationListener(NotificationPlanner planner, NotificationDispatcher dispatcher) {
        this.planner = planner;
        this.dispatcher = dispatcher;
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(IncidentChanged event) {
        run("incident change " + event.action() + " on " + event.incidentCode(),
                () -> planner.plan(event), dispatcher::dispatch);
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(TriageNeeded event) {
        run("triage of " + event.incidentCode(), () -> planner.plan(event), dispatcher::dispatch);
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(SlaWarning event) {
        run("SLA warning on " + event.incidentCode(), () -> planner.plan(event), dispatcher::dispatchOrHold);
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(SlaViolated event) {
        run("SLA violation on " + event.incidentCode(), () -> planner.plan(event), dispatcher::dispatch);
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(IncidentEscalated event) {
        run("escalation of " + event.incidentCode() + " to level " + event.toLevel(),
                () -> planner.plan(event), dispatcher::dispatch);
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(EscalationExhausted event) {
        run("exhausted escalation of " + event.incidentCode(), () -> planner.plan(event), dispatcher::dispatch);
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(SlaRunCompleted event) {
        try {
            dispatcher.flushDigests();
        } catch (RuntimeException ex) {
            log.error("Could not send the SLA warning digests of a monitor run", ex);
        }
    }

    /** Plans, then sends each request on its own, so one failing recipient does not cost the others theirs. */
    private void run(String what, Supplier<List<NotificationRequest>> plan,
                     java.util.function.Consumer<NotificationRequest> send) {
        List<NotificationRequest> requests;
        try {
            requests = plan.get();
        } catch (RuntimeException ex) {
            log.error("Could not decide who to notify about {}", what, ex);
            return;
        }
        for (NotificationRequest request : requests) {
            try {
                send.accept(request);
            } catch (RuntimeException ex) {
                log.error("Notification for {} failed ({} to {})", what, request.type(), request.audience(), ex);
            }
        }
    }
}
