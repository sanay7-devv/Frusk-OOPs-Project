package com.iitsm.application.config;

import java.time.Clock;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.config.AppConfigEntry;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.event.SecurityAuditEvent;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.InputValidationException.FieldIssue;
import com.iitsm.domain.repository.AppConfigRepository;

/**
 * Runtime configuration (table app_config) with an in-memory cache. Everything that reads a threshold, weight or
 * strategy asks {@link #current()}, which is a cheap read of an immutable snapshot. An update is validated as a
 * whole, saved, and the new snapshot is swapped in after the transaction commits, so the change applies at once
 * with no restart and a rolled-back change never reaches the cache.
 * <p>
 * The cache is per application instance, which fits the single-instance deployment of this project.
 */
@Service
public class ConfigService {

    private final AppConfigRepository repository;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private volatile AppSettings current;

    public ConfigService(AppConfigRepository repository, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.events = events;
        this.clock = clock;
        this.current = AppSettings.from(storedValues());
    }

    /** The settings in effect right now. */
    public AppSettings current() {
        return current;
    }

    /** One row of GET /admin/config: the effective value, its default and what it means. */
    public record ConfigItemView(String key, String value, String defaultValue, String description) {
    }

    public List<ConfigItemView> list() {
        return snapshotView(current);
    }

    /**
     * Applies several changes at once (PUT /admin/config). Unknown keys and broken rules are reported together as
     * fieldErrors keyed by the config key; nothing is saved unless the whole new set is valid. Audited as
     * CONFIG_CHANGED with every old and new value.
     */
    @Transactional
    public List<ConfigItemView> update(Long actorId, Map<String, String> changes) {
        List<FieldIssue> unknown = changes.keySet().stream()
                .filter(key -> ConfigKey.fromKey(key).isEmpty())
                .map(key -> new FieldIssue(key, "unknown setting"))
                .toList();
        if (!unknown.isEmpty()) {
            throw new InputValidationException("Some configuration values are invalid.", unknown);
        }

        Map<String, String> merged = new HashMap<>();
        current.asMap().forEach((key, value) -> merged.put(key.key(), value));
        changes.forEach((key, value) -> merged.put(key, value == null ? null : value.strip()));
        AppSettings next = AppSettings.from(merged);
        AppSettings previous = current;

        changes.keySet().forEach(keyName -> {
            ConfigKey key = ConfigKey.fromKey(keyName).orElseThrow();
            String value = next.raw(key);
            repository.findById(keyName).ifPresentOrElse(
                    entry -> entry.changeValue(value),
                    () -> repository.save(new AppConfigEntry(keyName, value, key.description())));
        });

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                current = next;
            }
        });
        String summary = changes.keySet().stream()
                .map(keyName -> {
                    ConfigKey key = ConfigKey.fromKey(keyName).orElseThrow();
                    return keyName + " " + previous.raw(key) + " → " + next.raw(key);
                })
                .collect(Collectors.joining(", "));
        events.publishEvent(new SecurityAuditEvent(AuditAction.CONFIG_CHANGED, actorId,
                "Settings changed: " + summary, clock.instant()));
        return snapshotView(next);
    }

    private static List<ConfigItemView> snapshotView(AppSettings settings) {
        List<ConfigItemView> items = new ArrayList<>();
        for (ConfigKey key : ConfigKey.values()) {
            items.add(new ConfigItemView(key.key(), settings.raw(key), key.defaultValue(), key.description()));
        }
        return items;
    }

    private Map<String, String> storedValues() {
        Map<String, String> stored = new HashMap<>();
        repository.findAll().forEach(entry -> stored.put(entry.getKey(), entry.getValue()));
        return stored;
    }
}
