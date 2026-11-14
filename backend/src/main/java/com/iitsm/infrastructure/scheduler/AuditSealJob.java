package com.iitsm.infrastructure.scheduler;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.stereotype.Component;

import com.iitsm.application.audit.AuditSealService;
import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.ConfigKey;

/**
 * Seals new audit records on the interval in app_config {@code audit.seal.interval.seconds} (S3, DEC-91). The interval
 * is read again after every run. Never throws: a failed run is logged and the next one is still scheduled. Off in the
 * test profile with the other jobs.
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class AuditSealJob implements SchedulingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(AuditSealJob.class);

    private final AuditSealService sealer;
    private final ConfigService config;

    public AuditSealJob(AuditSealService sealer, ConfigService config) {
        this.sealer = sealer;
        this.config = config;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        registrar.addTriggerTask(this::run, context -> {
            Instant last = context.lastCompletion();
            Instant base = last != null ? last : context.getClock().instant();
            return base.plusSeconds(config.current().intValue(ConfigKey.AUDIT_SEAL_INTERVAL_SECONDS));
        });
    }

    void run() {
        try {
            sealer.seal(true);
        } catch (RuntimeException ex) {
            log.error("Audit seal run failed", ex);
        }
    }
}
