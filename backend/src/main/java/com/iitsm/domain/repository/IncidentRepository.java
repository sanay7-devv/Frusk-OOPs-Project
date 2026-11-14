package com.iitsm.domain.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;

/** Repository pattern: storage of incidents. */
public interface IncidentRepository {

    Optional<Incident> findById(Long id);

    /** A technician's incidents in the given states (workload). */
    List<Incident> findByAssignee_IdAndStatusIn(Long assigneeId, Collection<IncidentStatus> statuses);

    /** Every assigned incident in the given states, for the workload of all technicians in one query. */
    List<Incident> findByAssigneeIsNotNullAndStatusIn(Collection<IncidentStatus> statuses);

    /** Service familiarity: incidents on one service a technician resolved since a moment. */
    long countByAssignee_IdAndService_IdAndResolvedAtAfter(Long assigneeId, Long serviceId, Instant since);

    long countByAssignee_IdAndResolvedAtAfter(Long assigneeId, Instant since);

    /** SLA monitor: ids of incidents in the given states with deadlines set and at least one clock not violated. */
    List<Long> findSlaMonitorCandidates(Collection<IncidentStatus> statuses);

    /**
     * Escalation monitor: ids of P1 and P2 incidents nobody has acknowledged: ASSIGNED, or CLASSIFIED with no
     * assignee (triage, DEC-48).
     */
    List<Long> findEscalationCandidates();

    /** Auto-verify: ids of incidents RESOLVED at or before the cutoff and not reopened since. */
    List<Long> findResolvedUpTo(Instant cutoff);

    /** Every incident grouped under a problem record, in creation order. */
    List<Incident> findByProblemIdOrderByCreatedAtAsc(Long problemId);

    Incident save(Incident incident);
}
