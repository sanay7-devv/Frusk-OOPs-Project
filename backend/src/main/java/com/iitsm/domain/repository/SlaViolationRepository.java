package com.iitsm.domain.repository;

import java.time.Instant;
import java.util.List;

import com.iitsm.domain.sla.SlaViolation;

/** Repository pattern: the append-only record of missed SLA deadlines. No update or delete. */
public interface SlaViolationRepository {

    SlaViolation save(SlaViolation violation);

    /** Every violation of one incident, oldest first (post-incident report). */
    List<SlaViolation> findByIncident_IdOrderByCreatedAtAsc(Long incidentId);

    /** Violations recorded in [from, to), newest first, with incident and technician loaded. */
    PageSlice<SlaViolation> findRecorded(Instant from, Instant to, int page, int size);
}
