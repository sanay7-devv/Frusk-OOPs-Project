package com.iitsm.infrastructure.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import com.iitsm.application.demo.AdjustableClock;
import com.iitsm.domain.user.UserFactory;

/**
 * The demo profile's clock (D1, DEC-45): the one {@code Clock} bean is an {@link AdjustableClock}, so everything that
 * reads the injected clock sees the moved time. Replaces {@link ClockConfig}, which is active in every other profile.
 */
@Configuration
@Profile("demo")
public class DemoClockConfig {

    @Bean
    AdjustableClock clock() {
        return new AdjustableClock(Clock.systemUTC());
    }

    @Bean
    UserFactory userFactory(Clock clock) {
        return new UserFactory(clock);
    }
}
