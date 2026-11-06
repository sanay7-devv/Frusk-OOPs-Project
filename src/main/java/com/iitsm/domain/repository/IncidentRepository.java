package com.iitsm.domain.repository;

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

    Incident save(Incident incident);
}
