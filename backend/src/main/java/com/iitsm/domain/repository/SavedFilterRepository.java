package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.search.SavedFilter;

/** Repository pattern: storage of saved incident filters. */
public interface SavedFilterRepository {

    List<SavedFilter> findByUser_IdOrderByNameAsc(Long userId);

    Optional<SavedFilter> findByIdAndUser_Id(Long id, Long userId);

    long countByUser_Id(Long userId);

    boolean existsByUser_IdAndNameIgnoreCase(Long userId, String name);

    SavedFilter save(SavedFilter filter);

    void delete(SavedFilter filter);
}
