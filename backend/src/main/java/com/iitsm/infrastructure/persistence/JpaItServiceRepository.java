package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.service.ItService;
import com.iitsm.domain.repository.ItServiceRepository;

/** Spring Data implementation of the domain {@link ItServiceRepository}. */
public interface JpaItServiceRepository extends JpaRepository<ItService, Long>, ItServiceRepository {
}
