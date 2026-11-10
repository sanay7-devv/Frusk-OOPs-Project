package com.iitsm.infrastructure.persistence;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.iitsm.domain.incident.IncidentCodeGenerator;

/**
 * Incident codes from the database sequence incident_code_seq (Appendix A.3): INC-2026-00001, INC-2026-00002, ...
 * A sequence never hands out the same number twice, even under concurrent requests.
 */
@Component
public class SequenceIncidentCodeGenerator implements IncidentCodeGenerator {

    public static final String SEQUENCE = "incident_code_seq";

    private final JdbcTemplate jdbc;

    public SequenceIncidentCodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public String nextCode(int year) {
        Long next = jdbc.queryForObject("select nextval('" + SEQUENCE + "')", Long.class);
        return String.format("INC-%d-%05d", year, next);
    }
}
