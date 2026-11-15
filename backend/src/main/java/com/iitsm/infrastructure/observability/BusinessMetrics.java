package com.iitsm.infrastructure.observability;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.event.EscalationExhausted;
import com.iitsm.domain.event.IncidentChanged;
import com.iitsm.domain.event.IncidentEscalated;
import com.iitsm.domain.event.SlaViolated;
import com.iitsm.domain.event.SlaWarning;
import com.iitsm.domain.event.TriageNeeded;

import io.micrometer.core.instrument.MeterRegistry;

/**
 * Turns the domain events into Prometheus counters (A8, decision DEC-115): one more Observer of the events the audit
 * trail, the notifications and the dashboard already listen to. It reads events only and never changes behavior.
 * Counters are incremented after commit, so a rolled-back action is not counted.
 */
@Component
public class BusinessMetrics {

    private final MeterRegistry registry;

    public BusinessMetrics(MeterRegistry registry) {
        this.registry = registry;
        // Registered at zero so rate() and absent() work in Grafana before the first event.
        registry.counter("iitsm.incidents.reported");
        registry.counter("iitsm.incidents.resolved");
        registry.counter("iitsm.escalations.exhausted");
        registry.counter("iitsm.triage.needed");
        registry.counter("iitsm.simulations");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(IncidentChanged event) {
        if (event.action() == AuditAction.INCIDENT_CREATED) {
            registry.counter("iitsm.incidents.reported").increment();
        }
        if (event.action() == AuditAction.RESOLVED) {
            registry.counter("iitsm.incidents.resolved").increment();
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(SlaWarning event) {
        registry.counter("iitsm.sla.warnings", "priority", event.priority().name(), "clock", event.clock().name())
                .increment();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(SlaViolated event) {
        registry.counter("iitsm.sla.violations", "priority", event.priority().name(), "clock", event.clock().name())
                .increment();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(IncidentEscalated event) {
        registry.counter("iitsm.escalations", "to_level", String.valueOf(event.toLevel())).increment();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(EscalationExhausted event) {
        registry.counter("iitsm.escalations.exhausted").increment();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(TriageNeeded event) {
        registry.counter("iitsm.triage.needed").increment();
    }
}
