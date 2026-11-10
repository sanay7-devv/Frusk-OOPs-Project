package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.sla.EscalationPolicy;
import com.iitsm.domain.repository.EscalationPolicyRepository;

/** Spring Data implementation of the domain {@link EscalationPolicyRepository}. */
public interface JpaEscalationPolicyRepository extends JpaRepository<EscalationPolicy, Long>, EscalationPolicyRepository {
}
