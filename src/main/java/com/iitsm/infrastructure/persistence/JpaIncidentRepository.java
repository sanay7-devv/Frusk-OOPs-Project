package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.repository.IncidentRepository;

/** Spring Data implementation of the domain {@link IncidentRepository}. */
public interface JpaIncidentRepository extends JpaRepository<Incident, Long>, IncidentRepository {
}
