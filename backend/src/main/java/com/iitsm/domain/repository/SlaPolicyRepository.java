package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.sla.SlaPolicy;

/** Repository pattern: storage of SLA policies. */
public interface SlaPolicyRepository {

    Optional<SlaPolicy> findById(Long id);

    List<SlaPolicy> findAll();

    Optional<SlaPolicy> findByService_IdAndPriority(Long serviceId, Priority priority);

    /** The global default for a priority (service_id is null). */
    Optional<SlaPolicy> findByServiceIsNullAndPriority(Priority priority);

    SlaPolicy save(SlaPolicy policy);

    void delete(SlaPolicy policy);
}
