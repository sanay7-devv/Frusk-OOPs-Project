package com.iitsm.domain.repository;

import java.util.List;

import com.iitsm.domain.audit.AuditQuery;
import com.iitsm.domain.audit.AuditRecord;

/** Repository pattern: the audit trail. Insert and read only; no update or delete exists (handbook 2.5 M8). */
public interface AuditRepository {

    AuditRecord insert(AuditRecord entry);

    /** One incident's trail, oldest first, with actors loaded. */
    List<AuditRecord> findByIncident(Long incidentId);

    /** Newest first, with incident and actor loaded. */
    PageSlice<AuditRecord> search(AuditQuery query);
}
