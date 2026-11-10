package com.iitsm.domain.config;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One stored configuration value (table app_config). Keys and their rules are defined by {@link ConfigKey}. */
@Entity
@Table(name = "app_config")
public class AppConfigEntry {

    @Id
    @Column(name = "key", length = 80)
    private String key;

    @Column(name = "value", nullable = false, length = 200)
    private String value;

    @Column(name = "description", length = 200)
    private String description;

    protected AppConfigEntry() {
    }

    public AppConfigEntry(String key, String value, String description) {
        this.key = key;
        this.value = value;
        this.description = description;
    }

    public String getKey() {
        return key;
    }

    public String getValue() {
        return value;
    }

    public String getDescription() {
        return description;
    }

    public void changeValue(String newValue) {
        this.value = newValue;
    }
}
