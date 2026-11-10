package com.iitsm.infrastructure.persistence;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * TEMPORARY, active only with the schema-auto profile (decision D-006): Hibernate does not create sequences that are
 * not used for ids, so this creates incident_code_seq. Delete together with the profile once V3 creates it.
 */
@Component
@Profile("schema-auto")
public class SchemaAutoSupport {

    private final JdbcTemplate jdbc;

    public SchemaAutoSupport(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    void createMissingSequences() {
        jdbc.execute("create sequence if not exists " + SequenceIncidentCodeGenerator.SEQUENCE);
    }
}
