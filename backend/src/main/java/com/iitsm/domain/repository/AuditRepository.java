package com.iitsm.domain.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.audit.AuditQuery;
import com.iitsm.domain.audit.AuditRecord;

/** Repository pattern: the audit trail. Insert and read only; no update or delete exists (handbook 2.5 M8). */
public interface AuditRepository {

    AuditRecord insert(AuditRecord entry);

    /** One incident's trail, oldest first, with actors loaded. */
    List<AuditRecord> findByIncident(Long incidentId);

    /** When the newest entry of one of the given actions was written for an incident (escalation timers). */
    Optional<Instant> latestAt(Long incidentId, Collection<AuditAction> actions);

    /** Whether the one final "escalation exhausted" alert is already in the incident's trail (DEC-49). */
    boolean hasEscalationExhausted(Long incidentId);

    /** Newest first, with incident and actor loaded. */
    PageSlice<AuditRecord> search(AuditQuery query);
}
