package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

import com.iitsm.domain.service.ItService;
import com.iitsm.domain.repository.ItServiceRepository;

/** Spring Data implementation of the domain {@link ItServiceRepository}. */
public interface JpaItServiceRepository extends JpaRepository<ItService, Long>, ItServiceRepository {

    @Override
    @org.springframework.data.jpa.repository.Query("select s from ItService s join s.dependencies d "
            + "where d.id = :serviceId and s.active = true order by s.name")
    List<ItService> findDependantsOf(Long serviceId);
}
