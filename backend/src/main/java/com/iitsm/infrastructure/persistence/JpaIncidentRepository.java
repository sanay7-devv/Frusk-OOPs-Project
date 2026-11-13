package com.iitsm.infrastructure.persistence;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.repository.IncidentRepository;

/** Spring Data implementation of the domain {@link IncidentRepository}. */
public interface JpaIncidentRepository extends JpaRepository<Incident, Long>, IncidentRepository {

    @Override
    @Query("select i.id from Incident i where i.status in :statuses and i.sla.resolutionDue is not null "
            + "and (i.sla.responseViolated = false or i.sla.resolutionViolated = false) order by i.id")
    List<Long> findSlaMonitorCandidates(Collection<IncidentStatus> statuses);

    @Override
    @Query("select i.id from Incident i where i.priority in (com.iitsm.domain.priority.Priority.P1, "
            + "com.iitsm.domain.priority.Priority.P2) and (i.status = com.iitsm.domain.incident.IncidentStatus.ASSIGNED "
            + "or (i.status = com.iitsm.domain.incident.IncidentStatus.CLASSIFIED and i.assignee is null)) "
            + "order by i.id")
    List<Long> findEscalationCandidates();

    @Override
    @Query("select i.id from Incident i where i.status = com.iitsm.domain.incident.IncidentStatus.RESOLVED "
            + "and i.resolvedAt <= :cutoff order by i.id")
    List<Long> findResolvedUpTo(Instant cutoff);
}
