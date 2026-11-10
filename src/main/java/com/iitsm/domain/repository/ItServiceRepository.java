package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.service.ItService;

/** Repository pattern: storage of IT services. */
public interface ItServiceRepository {

    Optional<ItService> findById(Long id);

    List<ItService> findAllById(Iterable<Long> ids);

    List<ItService> findAllByOrderByNameAsc();

    List<ItService> findByActiveTrueOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    ItService save(ItService service);
}
