package com.iitsm.domain.repository;

import java.time.Instant;

import com.iitsm.domain.sla.SlaViolation;

/** Repository pattern: the append-only record of missed SLA deadlines. No update or delete. */
public interface SlaViolationRepository {

    SlaViolation save(SlaViolation violation);

    /** Violations recorded in [from, to), newest first, with incident and technician loaded. */
    PageSlice<SlaViolation> findRecorded(Instant from, Instant to, int page, int size);
}
