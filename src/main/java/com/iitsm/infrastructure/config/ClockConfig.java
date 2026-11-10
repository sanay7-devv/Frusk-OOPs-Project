package com.iitsm.infrastructure.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.iitsm.domain.user.UserFactory;

/**
 * The single source of time. Everything time-based (lockout, SLA, escalation, auto-verify) takes this Clock
 * instead of calling Instant.now(), so tests can replace it with a fixed or moving clock.
 */
@Configuration
public class ClockConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    UserFactory userFactory(Clock clock) {
        return new UserFactory(clock);
    }
}
