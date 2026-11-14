package com.iitsm.application.audit;

import java.time.Instant;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.audit.AuditRecord;
import com.iitsm.domain.event.IncidentChanged;
import com.iitsm.domain.event.SecurityAuditEvent;
import com.iitsm.domain.event.SlaViolated;
import com.iitsm.domain.event.SlaWarning;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.repository.AuditRepository;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.User;

/**
 * Observer: turns events into audit records (handbook 2.5 M8).
 * <p>
 * Incident events are written <b>inside the transaction of the action</b> (a plain synchronous listener), so an
 * action can never commit without its audit record, and a failed action leaves none. Security events (failed
 * login, refused request) are written in a <b>new transaction</b>, because the request that caused them usually
 * fails and rolls back, and the record must survive that.
 */
@Component
public class AuditListener {

    private final AuditRepository audit;
    private final IncidentRepository incidents;
    private final UserRepository users;

    public AuditListener(AuditRepository audit, IncidentRepository incidents, UserRepository users) {
        this.audit = audit;
        this.incidents = incidents;
        this.users = users;
    }

    @EventListener
    public void on(IncidentChanged e) {
        if (e.internal()) {
            audit.insert(AuditRecord.internal(incident(e.incidentId()), actor(e.actorId()), e.action(),
                    e.previousState(), e.newState(), e.description(), e.occurredAt()));
            return;
        }
        record(e.incidentId(), e.actorId(), e.action(), e.previousState(), e.newState(), e.description(),
                e.occurredAt());
    }

    @EventListener
    public void on(SlaWarning e) {
        String text = (e.warning() == 1 ? "First" : "Second") + " SLA warning: " + clockName(e.clock().name())
                + " clock at " + e.percent() + "% (due " + e.due() + ")";
        record(e.incidentId(), null, AuditAction.SLA_WARNING, null, null, text, e.occurredAt());
    }

    @EventListener
    public void on(SlaViolated e) {
        String text = "SLA violated: " + clockName(e.clock().name()) + " deadline missed by "
                + e.overdueSeconds() + " s";
        record(e.incidentId(), null, AuditAction.SLA_VIOLATED, null, null, text, e.occurredAt());
    }

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(SecurityAuditEvent e) {
        record(null, e.actorId(), e.action(), null, null, e.description(), e.occurredAt());
    }

    private void record(Long incidentId, Long actorId, AuditAction action, IncidentStatus previous,
                        IncidentStatus next, String description, Instant at) {
        audit.insert(AuditRecord.of(incident(incidentId), actor(actorId), action, previous, next, description, at));
    }

    private Incident incident(Long incidentId) {
        return incidentId == null ? null : incidents.findById(incidentId).orElseThrow();
    }

    private User actor(Long actorId) {
        return actorId == null ? null : users.findById(actorId).orElse(null);
    }

    private static String clockName(String clock) {
        return clock.charAt(0) + clock.substring(1).toLowerCase(java.util.Locale.ROOT);
    }
}
