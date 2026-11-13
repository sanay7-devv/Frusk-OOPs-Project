package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.repository.SavedFilterRepository;
import com.iitsm.domain.search.SavedFilter;

/** Spring Data implementation of the domain {@link SavedFilterRepository}. */
public interface JpaSavedFilterRepository extends JpaRepository<SavedFilter, Long>, SavedFilterRepository {
}
