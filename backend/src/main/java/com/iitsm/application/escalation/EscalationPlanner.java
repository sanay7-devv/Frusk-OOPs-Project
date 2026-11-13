package com.iitsm.application.escalation;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.escalation.EscalationChain;
import com.iitsm.domain.escalation.EscalationRequest;
import com.iitsm.domain.escalation.EscalationStep;
import com.iitsm.domain.escalation.EscalationTimeouts;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.repository.AuditRepository;
import com.iitsm.domain.repository.EscalationPolicyRepository;
import com.iitsm.domain.sla.EscalationPolicy;

/**
 * Turns an incident and the live policies into the input of the {@link EscalationChain}. One place, used by the
 * monitor (what is due now) and by the preview (what is coming), so they can never disagree.
 * <p>
 * The moment the incident came to its current level is read from the audit trail (decision DEC-50): the newest of
 * its creation, an assignment, a reassignment, an escalation or a priority change. No extra column is needed, and
 * a reassignment restarts the timer but keeps the level.
 */
@Component
public class EscalationPlanner {

    private static final Set<AuditAction> TIMER_RESTARTS = EnumSet.of(AuditAction.ASSIGNED, AuditAction.REASSIGNED,
            AuditAction.ESCALATED, AuditAction.PRIORITY_CHANGED);

    private final AuditRepository audit;
    private final EscalationPolicyRepository policies;
    private final ConfigService config;
    private final EscalationChain chain = new EscalationChain();

    public EscalationPlanner(AuditRepository audit, EscalationPolicyRepository policies, ConfigService config) {
        this.audit = audit;
        this.policies = policies;
        this.config = config;
    }

    /** P1 or P2 that nobody has acknowledged (assigned, or in triage with nobody to take it). */
    public boolean watches(Incident incident) {
        Priority priority = incident.getPriority();
        return (priority == Priority.P1 || priority == Priority.P2) && incident.isUnattended();
    }

    /** The step to perform now, if the timeout of the incident's level has passed. */
    public Optional<EscalationStep> due(Incident incident, Instant now) {
        return watches(incident) ? chain.due(request(incident), now) : Optional.empty();
    }

    /** The next step and when it happens, due or not (preview, and passing over an empty level). */
    public Optional<EscalationStep> next(Incident incident) {
        return watches(incident) ? chain.next(request(incident)) : Optional.empty();
    }

    private EscalationRequest request(Incident incident) {
        Instant since = audit.latestAt(incident.getId(), TIMER_RESTARTS)
                .filter(at -> at.isAfter(incident.getCreatedAt()))
                .orElse(incident.getCreatedAt());
        boolean exhausted = incident.getEscalationLevel() == 3 && audit.hasEscalationExhausted(incident.getId());
        return new EscalationRequest(incident.getPriority(), incident.getEscalationLevel(), since, exhausted,
                timeouts());
    }

    private EscalationTimeouts timeouts() {
        Map<Priority, Map<Integer, Duration>> byPriority = new EnumMap<>(Priority.class);
        for (EscalationPolicy policy : policies.findAllByOrderByPriorityAscLevelAsc()) {
            byPriority.computeIfAbsent(policy.getPriority(), p -> new HashMap<>())
                    .put(policy.getLevel(), policy.timeout());
        }
        Duration exhaustedWait = Duration.ofMinutes(config.current().intValue(ConfigKey.ESCALATION_EXHAUSTED_MINUTES));
        return new EscalationTimeouts(byPriority, exhaustedWait);
    }
}
