package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.config.AppConfigEntry;

/** Repository pattern: storage of the runtime configuration (table app_config). */
public interface AppConfigRepository {

    List<AppConfigEntry> findAll();

    Optional<AppConfigEntry> findById(String key);

    AppConfigEntry save(AppConfigEntry entry);
}
