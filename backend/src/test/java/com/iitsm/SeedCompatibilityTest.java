package com.iitsm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.priority.PriorityEngine;
import com.iitsm.domain.priority.PriorityInput;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

/** Runs only in the isolated dev/demo seed CI jobs, never in schema-only tests. */
@SpringBootTest
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "VERIFY_DEMO_SEEDS", matches = "true")
class SeedCompatibilityTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwords;

    @Test
    void all_demo_password_hashes_accept_the_documented_password() {
        var rows = jdbc.queryForList("select email,password_hash from users");
        assertEquals(18, rows.size());
        for (var row : rows) {
            assertTrue(passwords.matches("Demo@1234", (String) row.get("password_hash")),
                    "Demo password rejected for " + row.get("email"));
        }
    }

    @Test
    void generated_priorities_match_the_actual_java_engine() {
        var engine = PriorityEngine.standard();
        var settings = AppSettings.defaults();
        var rows = jdbc.queryForList("""
                select i.code,i.impact,i.urgency,i.affected_users,i.priority_score,
                       trim(i.priority) as priority,s.criticality,s.name as service,s.always_p1,
                       c.name as category,i.priority_breakdown->>'overrideRule' as override_rule
                from incidents i join services s on s.id=i.service_id
                join categories c on c.id=i.category_id
                """);
        assertEquals(212, rows.size());
        for (var row : rows) {
            var input = new PriorityInput(
                    ((Number) row.get("impact")).intValue(),
                    ((Number) row.get("urgency")).intValue(),
                    ((Number) row.get("criticality")).intValue(),
                    ((Number) row.get("affected_users")).intValue(),
                    (String) row.get("service"), (Boolean) row.get("always_p1"),
                    "Security".equals(row.get("category")));
            var result = engine.calculate(input, settings);
            String code = (String) row.get("code");
            assertEquals(((Number) row.get("priority_score")).intValue(), result.score(), code);
            assertEquals(row.get("priority"), result.band().name(), code);
            assertEquals(row.get("override_rule"), result.overrideRule(), code);
        }
    }
}
