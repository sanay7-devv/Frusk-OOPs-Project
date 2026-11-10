package com.iitsm.infrastructure.scheduler;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.stereotype.Component;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.sla.SlaMonitor;
import com.iitsm.domain.config.ConfigKey;

/**
 * Runs the {@link SlaMonitor} on the interval in app_config {@code sla.monitor.interval.seconds} (handbook 2.7:
 * 60 s, 30 s in the demo). The interval is read again after every run, so a change applies without a restart.
 * Never throws: a failed run is logged and the next one is still scheduled.
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SlaMonitorJob implements SchedulingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(SlaMonitorJob.class);

    private final SlaMonitor monitor;
    private final ConfigService config;

    public SlaMonitorJob(SlaMonitor monitor, ConfigService config) {
        this.monitor = monitor;
        this.config = config;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        registrar.addTriggerTask(this::run, context -> {
            Instant last = context.lastCompletion();
            Instant base = last != null ? last : context.getClock().instant();
            return base.plusSeconds(config.current().intValue(ConfigKey.SLA_MONITOR_INTERVAL_SECONDS));
        });
    }

    void run() {
        try {
            SlaMonitor.RunResult result = monitor.runOnce();
            if (result.warnings() + result.violations() + result.failed() > 0) {
                log.info("SLA monitor: {} checked, {} warnings, {} violations, {} failed", result.checked(),
                        result.warnings(), result.violations(), result.failed());
            }
        } catch (RuntimeException ex) {
            log.error("SLA monitor run failed", ex);
        }
    }
}
