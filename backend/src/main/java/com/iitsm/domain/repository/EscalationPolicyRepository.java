package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.sla.EscalationPolicy;

/** Repository pattern: storage of escalation policies. */
public interface EscalationPolicyRepository {

    Optional<EscalationPolicy> findById(Long id);

    List<EscalationPolicy> findAllByOrderByPriorityAscLevelAsc();

    boolean existsByPriorityAndLevel(Priority priority, short level);

    EscalationPolicy save(EscalationPolicy policy);

    void delete(EscalationPolicy policy);
}
