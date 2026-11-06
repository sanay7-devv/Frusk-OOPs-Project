package com.iitsm.application.sla;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.event.SlaViolated;
import com.iitsm.domain.event.SlaWarning;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.incident.SlaAlert;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.SlaViolationRepository;
import com.iitsm.domain.sla.SlaPolicy;
import com.iitsm.domain.sla.SlaPolicyResolver;
import com.iitsm.domain.sla.SlaViolation;
import com.iitsm.domain.user.User;

/**
 * The SLA monitor (handbook 2.5 M7, 2.7): checks every incident with a running clock, raises the first and second
 * warnings and records violations, each exactly once (the fire-once flags live in the incident's SlaTracker).
 * <p>
 * Each incident is checked in its own short transaction, so one bad row (a missing SLA policy, a concurrent edit)
 * is logged and retried on the next run without stopping the others. Running twice in a row is harmless: the
 * second run finds every flag already set.
 */
@Service
public class SlaMonitor {

    private static final Logger log = LoggerFactory.getLogger(SlaMonitor.class);

    /** What one run did, for the log and for tests. */
    public record RunResult(int checked, int warnings, int violations, int failed) {
    }

    private final IncidentRepository incidents;
    private final SlaViolationRepository violations;
    private final SlaPolicyResolver slaPolicies;
    private final ConfigService config;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate transaction;
    private final Clock clock;

    public SlaMonitor(IncidentRepository incidents, SlaViolationRepository violations, SlaPolicyResolver slaPolicies,
                      ConfigService config, ApplicationEventPublisher events, PlatformTransactionManager transactions,
                      Clock clock) {
        this.incidents = incidents;
        this.violations = violations;
        this.slaPolicies = slaPolicies;
        this.config = config;
        this.events = events;
        this.transaction = new TransactionTemplate(transactions);
        this.clock = clock;
    }

    public RunResult runOnce() {
        List<Long> candidates = incidents.findSlaMonitorCandidates(IncidentStatus.OPEN);
        int warnings = 0;
        int violated = 0;
        int failed = 0;
        for (Long id : candidates) {
            try {
                List<SlaAlert> alerts = transaction.execute(status -> check(id));
                for (SlaAlert alert : alerts) {
                    if (alert.isViolation()) {
                        violated++;
                    } else {
                        warnings++;
                    }
                }
            } catch (RuntimeException ex) {
                failed++;
                log.warn("SLA check of incident {} failed, retrying next run: {}", id, ex.toString());
            }
        }
        return new RunResult(candidates.size(), warnings, violated, failed);
    }

    private List<SlaAlert> check(Long id) {
        Incident incident = incidents.findById(id).orElse(null);
        if (incident == null || incident.getPriority() == null) {
            return List.of();
        }
        AppSettings settings = config.current();
        SlaPolicy policy = slaPolicies.resolve(incident.getService(), incident.getPriority());
        Instant now = clock.instant();
        List<SlaAlert> alerts = incident.checkSla(now, policy.responseTarget(), policy.resolutionTarget(),
                settings.intValue(ConfigKey.SLA_WARN_FIRST_PERCENT), settings.intValue(ConfigKey.SLA_WARN_SECOND_PERCENT));
        if (alerts.isEmpty()) {
            return alerts;
        }
        incidents.save(incident);
        Long assigneeId = assigneeId(incident);
        for (SlaAlert alert : alerts) {
            if (alert.isViolation()) {
                SlaViolation violation = violations.save(SlaViolation.of(incident, alert, now));
                events.publishEvent(new SlaViolated(incident.getId(), incident.getCode(), incident.getPriority(),
                        alert.clock(), alert.overdueSeconds(), violation.getId(), assigneeId, now));
                log.info("SLA violated: {} {} clock, {} s overdue", incident.getCode(), alert.clock(),
                        alert.overdueSeconds());
            } else {
                int warning = alert.level() == SlaAlert.Level.FIRST_WARNING ? 1 : 2;
                events.publishEvent(new SlaWarning(incident.getId(), incident.getCode(), incident.getPriority(),
                        alert.clock(), warning, alert.percent(), alert.due(), assigneeId, now));
                log.info("SLA warning {}: {} {} clock at {}%", warning, incident.getCode(), alert.clock(),
                        alert.percent());
            }
        }
        return alerts;
    }

    private static Long assigneeId(Incident incident) {
        User assignee = incident.getAssignee();
        return assignee == null ? null : assignee.getId();
    }
}
