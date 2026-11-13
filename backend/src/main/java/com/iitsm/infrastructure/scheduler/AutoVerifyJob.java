package com.iitsm.infrastructure.scheduler;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.stereotype.Component;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.AutoVerifyMonitor;
import com.iitsm.domain.config.ConfigKey;

/**
 * Runs the {@link AutoVerifyMonitor} on the interval in app_config {@code verify.monitor.interval.seconds}
 * (handbook 2.7: 5 minutes, 30 seconds in the demo), read again after every run. Never throws.
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class AutoVerifyJob implements SchedulingConfigurer {

    private static final int FIRST_RUN_DELAY_SECONDS = 10;
    private static final Logger log = LoggerFactory.getLogger(AutoVerifyJob.class);

    private final AutoVerifyMonitor monitor;
    private final ConfigService config;

    public AutoVerifyJob(AutoVerifyMonitor monitor, ConfigService config) {
        this.monitor = monitor;
        this.config = config;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        registrar.addTriggerTask(this::run, context -> {
            Instant last = context.lastCompletion();
            // the first run comes shortly after start, so a fresh start does not wait a whole interval
            if (last == null) {
                return context.getClock().instant().plusSeconds(FIRST_RUN_DELAY_SECONDS);
            }
            return last.plusSeconds(config.current().intValue(ConfigKey.VERIFY_MONITOR_INTERVAL_SECONDS));
        });
    }

    void run() {
        try {
            AutoVerifyMonitor.RunResult result = monitor.runOnce();
            if (result.closed() + result.failed() > 0) {
                log.info("Auto-verify: {} checked, {} closed, {} failed", result.checked(), result.closed(),
                        result.failed());
            }
        } catch (RuntimeException ex) {
            log.error("Auto-verify run failed", ex);
        }
    }
}
