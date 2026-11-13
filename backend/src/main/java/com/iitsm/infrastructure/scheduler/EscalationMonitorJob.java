package com.iitsm.infrastructure.scheduler;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.stereotype.Component;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.escalation.EscalationMonitor;
import com.iitsm.domain.config.ConfigKey;

/**
 * Runs the {@link EscalationMonitor} on the interval in app_config {@code escalation.monitor.interval.seconds}
 * (handbook 2.7: 60 s, 15 s in the demo), read again after every run so a change applies without a restart. Never
 * throws: a failed run is logged and the next one is still scheduled.
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class EscalationMonitorJob implements SchedulingConfigurer {

    private static final int FIRST_RUN_DELAY_SECONDS = 10;
    private static final Logger log = LoggerFactory.getLogger(EscalationMonitorJob.class);

    private final EscalationMonitor monitor;
    private final ConfigService config;

    public EscalationMonitorJob(EscalationMonitor monitor, ConfigService config) {
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
            return last.plusSeconds(config.current().intValue(ConfigKey.ESCALATION_MONITOR_INTERVAL_SECONDS));
        });
    }

    void run() {
        try {
            EscalationMonitor.RunResult result = monitor.runOnce();
            if (result.escalated() + result.exhausted() + result.failed() > 0) {
                log.info("Escalation monitor: {} checked, {} hops, {} exhausted, {} failed", result.checked(),
                        result.escalated(), result.exhausted(), result.failed());
            }
        } catch (RuntimeException ex) {
            log.error("Escalation monitor run failed", ex);
        }
    }
}
