package com.iitsm.infrastructure.scheduler;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Switches on the scheduled jobs (SLA monitor, and later escalation, auto-verify, risk scan). Off when
 * {@code app.scheduling.enabled=false} (test profile), so tests run a job by calling it directly.
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {
}
