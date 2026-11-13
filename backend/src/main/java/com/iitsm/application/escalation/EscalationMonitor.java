package com.iitsm.application.escalation;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.iitsm.application.incident.IncidentEventPublisher;
import com.iitsm.domain.escalation.EscalationStep;
import com.iitsm.domain.escalation.EscalationTarget;
import com.iitsm.domain.event.EscalationExhausted;
import com.iitsm.domain.event.IncidentEscalated;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.user.User;

/**
 * The escalation monitor (handbook 2.5 M11, 2.7; decisions DEC-48, DEC-49, DEC-50). Finds P1 and P2 incidents nobody
 * has acknowledged, assigned or in triage, and moves each up one level when its timeout has passed; at level 3 it
 * raises the one final "escalation exhausted" alert. Same shape as the SLA monitor (DEC-37): one transaction per
 * incident, a failed row is logged and retried on the next run, and running twice in a row is harmless because the
 * second run finds every timer restarted by the audit entry the first run wrote.
 * <p>
 * A level nobody holds is passed over in the same run (DEC-42): the incident climbs straight on, each hop with its
 * own audit entry and event, the skipped one with no recipients.
 */
@Service
public class EscalationMonitor {

    private static final Logger log = LoggerFactory.getLogger(EscalationMonitor.class);

    /** What one run did, for the log and for tests. {@code escalated} counts level hops, not incidents. */
    public record RunResult(int checked, int escalated, int exhausted, int failed) {
    }

    private record Outcome(int hops, boolean exhausted) {
        static final Outcome NONE = new Outcome(0, false);
    }

    private final IncidentRepository incidents;
    private final EscalationPlanner planner;
    private final EscalationRecipients recipients;
    private final IncidentEventPublisher publisher;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate transaction;
    private final Clock clock;

    public EscalationMonitor(IncidentRepository incidents, EscalationPlanner planner, EscalationRecipients recipients,
                             IncidentEventPublisher publisher, ApplicationEventPublisher events,
                             PlatformTransactionManager transactions, Clock clock) {
        this.incidents = incidents;
        this.planner = planner;
        this.recipients = recipients;
        this.publisher = publisher;
        this.events = events;
        this.transaction = new TransactionTemplate(transactions);
        this.clock = clock;
    }

    public RunResult runOnce() {
        List<Long> candidates = incidents.findEscalationCandidates();
        int hops = 0;
        int exhausted = 0;
        int failed = 0;
        for (Long id : candidates) {
            try {
                Outcome outcome = transaction.execute(status -> check(id));
                hops += outcome.hops();
                exhausted += outcome.exhausted() ? 1 : 0;
            } catch (RuntimeException ex) {
                failed++;
                log.warn("Escalation check of incident {} failed, retrying next run: {}", id, ex.toString());
            }
        }
        return new RunResult(candidates.size(), hops, exhausted, failed);
    }

    private Outcome check(Long id) {
        Incident incident = incidents.findById(id).orElse(null);
        if (incident == null) {
            return Outcome.NONE;
        }
        Instant now = clock.instant();
        Optional<EscalationStep> due = planner.due(incident, now);
        if (due.isEmpty()) {
            return Outcome.NONE;
        }
        if (due.get().kind() == EscalationStep.Kind.EXHAUSTED) {
            exhaust(incident, due.get(), now);
            incidents.save(incident);
            return new Outcome(0, true);
        }
        int hops = 0;
        EscalationStep step = due.get();
        while (true) {
            boolean covered = raise(incident, step, now);
            hops++;
            if (covered || incident.getEscalationLevel() >= EscalationTarget.TOP_LEVEL) {
                break;
            }
            // nobody holds the new level: pass over it at once, if the policies say where it goes next
            Optional<EscalationStep> onward = planner.next(incident);
            if (onward.isEmpty() || onward.get().kind() != EscalationStep.Kind.RAISE) {
                break;
            }
            step = onward.get();
        }
        incidents.save(incident);
        return new Outcome(hops, false);
    }

    /** One hop up the chain. Returns whether somebody holds the new level and was notified. */
    private boolean raise(Incident incident, EscalationStep step, Instant now) {
        User assignee = incident.getAssignee();
        incident.escalateUnattended(now);
        EscalationTarget target = EscalationTarget.ofLevel(incident.getEscalationLevel());
        List<User> holders = recipients.holdersOf(target);
        String why = assignee == null
                ? "no technician was assigned within " + step.allowed().toMinutes() + " min"
                : "not acknowledged by " + assignee.getName() + " within " + step.allowed().toMinutes() + " min";
        String who = holders.isEmpty() ? "nobody holds this level, passed over" : "notified " + names(holders);
        publisher.publishFact(incident, null, "Escalated to level " + incident.getEscalationLevel() + " ("
                + target.getLabel() + "): " + why + "; " + who);
        events.publishEvent(new IncidentEscalated(incident.getId(), incident.getCode(), incident.getPriority(),
                step.fromLevel(), incident.getEscalationLevel(), target, ids(holders),
                assignee == null ? null : assignee.getId(), false, now));
        log.info("Escalated {} to level {} ({}), {} recipient(s)", incident.getCode(), incident.getEscalationLevel(),
                target.getLabel(), holders.size());
        return !holders.isEmpty();
    }

    /** The one final alert after level 3 (DEC-49): audit entry, event, every administrator. */
    private void exhaust(Incident incident, EscalationStep step, Instant now) {
        incident.recordEscalationExhausted(now);
        List<User> admins = recipients.administrators();
        publisher.publishFact(incident, null, Incident.EXHAUSTED_PREFIX + ": still not acknowledged after "
                + step.allowed().toMinutes() + " min at level 3; alerted " + admins.size() + " administrator(s)");
        events.publishEvent(new EscalationExhausted(incident.getId(), incident.getCode(), incident.getPriority(),
                ids(admins), now));
        log.warn("Escalation exhausted for {}: alerted {} administrator(s)", incident.getCode(), admins.size());
    }

    private static List<Long> ids(List<User> users) {
        return users.stream().map(User::getId).toList();
    }

    private static String names(List<User> users) {
        String joined = users.stream().limit(3).map(User::getName).collect(Collectors.joining(", "));
        return users.size() > 3 ? joined + " and " + (users.size() - 3) + " more" : joined;
    }
}
