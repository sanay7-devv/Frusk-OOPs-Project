package com.iitsm.infrastructure.scheduler;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.stereotype.Component;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.intelligence.SlaRiskService;
import com.iitsm.domain.config.ConfigKey;

/**
 * Runs the SLA risk scan on the interval in app_config {@code sla.risk.scan.interval.seconds} (handbook 2.7: every
 * 5 minutes). The interval is read again after every run, so a change applies without a restart. Never throws: a
 * failed run is logged and the next one is still scheduled. Off in the test profile with the other jobs.
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SlaRiskScanJob implements SchedulingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(SlaRiskScanJob.class);
    private static final int STARTUP_DELAY_SECONDS = 30;

    private final SlaRiskService risk;
    private final ConfigService config;

    public SlaRiskScanJob(SlaRiskService risk, ConfigService config) {
        this.risk = risk;
        this.config = config;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        registrar.addTriggerTask(this::run, context -> {
            Instant last = context.lastCompletion();
            Instant base = last != null ? last : context.getClock().instant();
            int interval = config.current().intValue(ConfigKey.SLA_RISK_SCAN_INTERVAL_SECONDS);
            // the first scan comes soon after startup (at most 30 s), later ones every interval
            return base.plusSeconds(last != null ? interval : Math.min(interval, STARTUP_DELAY_SECONDS));
        });
    }

    void run() {
        try {
            SlaRiskService.ScanResult result = risk.scanOnce();
            if (result.newlyFlagged() + result.failed() > 0) {
                log.info("SLA risk scan: {} checked, {} newly at risk, {} at risk in all, {} failed", result.checked(),
                        result.newlyFlagged(), result.atRisk(), result.failed());
            }
        } catch (RuntimeException ex) {
            log.error("SLA risk scan failed", ex);
        }
    }
}
