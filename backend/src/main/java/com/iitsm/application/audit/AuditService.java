package com.iitsm.application.audit;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.audit.AuditQuery;
import com.iitsm.domain.audit.AuditRecord;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.repository.AuditRepository;
import com.iitsm.domain.repository.PageSlice;
import com.iitsm.domain.user.User;

/** Reading the audit trail: GET /audit for admins (contract B.4, C.4 AuditEntry). */
@Service
public class AuditService {

    /** One audit entry as the API shows it; actor null means the system. */
    public record AuditEntryView(Long id, Instant timestamp, Ref actor, AuditAction action, String incidentCode,
                                 IncidentStatus previousState, IncidentStatus newState, String description) {

        public static AuditEntryView of(AuditRecord r) {
            User actor = r.getActor();
            return new AuditEntryView(r.getId(), r.getCreatedAt(),
                    actor == null ? null : new Ref(actor.getId(), actor.getName()), r.getAction(),
                    r.getIncident() == null ? null : r.getIncident().getCode(), r.getPreviousState(),
                    r.getNewState(), r.getDescription());
        }
    }

    private final AuditRepository audit;

    public AuditService(AuditRepository audit) {
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageSlice<AuditEntryView> search(AuditQuery query) {
        if (query.from() != null && query.to() != null && !query.from().isBefore(query.to())) {
            throw new InputValidationException("to", "must be after from");
        }
        return audit.search(query).map(AuditEntryView::of);
    }
}
