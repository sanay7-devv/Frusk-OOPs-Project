package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.config.AppConfigEntry;
import com.iitsm.domain.repository.AppConfigRepository;

/** Spring Data implementation of the domain {@link AppConfigRepository}. */
public interface JpaAppConfigRepository extends JpaRepository<AppConfigEntry, String>, AppConfigRepository {
}
