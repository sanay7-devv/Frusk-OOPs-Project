package com.iitsm;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.TimeZone;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Verify application startup against the same disposable database used by integration tests. */
@SpringBootTest(properties={"spring.flyway.locations=classpath:db/migration", "app.scheduling.enabled=false"})
@ActiveProfiles("test")
@Testcontainers
class IitsmBackendApplicationTests {
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    @Container static final PostgreSQLContainer DATABASE = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", DATABASE::getJdbcUrl);
        properties.add("spring.datasource.username", DATABASE::getUsername);
        properties.add("spring.datasource.password", DATABASE::getPassword);
    }

    @Test void contextLoads() {
        assertEquals("UTC", TimeZone.getDefault().getID());
    }
}
