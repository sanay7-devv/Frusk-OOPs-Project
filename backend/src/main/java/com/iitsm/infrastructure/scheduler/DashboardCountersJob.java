package com.iitsm.infrastructure.scheduler;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.stereotype.Component;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.dashboard.DashboardService;
import com.iitsm.domain.config.ConfigKey;

/**
 * Ticks once a second and lets {@link DashboardService} push the dashboard counters when something changed, or when
 * {@code dashboard.counters.interval.seconds} passed in silence (decision DEC-81). A burst of events (one incident
 * creation publishes several) therefore costs one counters query, not one per event. Off in the test profile with
 * the other jobs.
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class DashboardCountersJob implements SchedulingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(DashboardCountersJob.class);

    private final DashboardService dashboard;
    private final ConfigService config;

    public DashboardCountersJob(DashboardService dashboard, ConfigService config) {
        this.dashboard = dashboard;
        this.config = config;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        registrar.addFixedDelayTask(this::run, Duration.ofSeconds(1));
    }

    void run() {
        try {
            dashboard.pushCountersIfDue(config.current().intValue(ConfigKey.DASHBOARD_COUNTERS_INTERVAL_SECONDS));
        } catch (RuntimeException ex) {
            log.warn("Could not push the dashboard counters: {}", ex.toString());
        }
    }
}
