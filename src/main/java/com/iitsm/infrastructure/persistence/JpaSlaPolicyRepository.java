package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.sla.SlaPolicy;
import com.iitsm.domain.repository.SlaPolicyRepository;

/** Spring Data implementation of the domain {@link SlaPolicyRepository}. */
public interface JpaSlaPolicyRepository extends JpaRepository<SlaPolicy, Long>, SlaPolicyRepository {
}
