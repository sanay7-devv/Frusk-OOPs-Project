package com.iitsm.infrastructure.scheduler;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.stereotype.Component;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.intelligence.EmbeddingService;
import com.iitsm.domain.config.ConfigKey;

/**
 * Embedding backfill (handbook 2.7): every {@code embedding.backfill.interval.seconds} (read again after each run)
 * embeds the incidents that have no vector yet, or one from an older model, a batch at a time and inside the
 * per-minute cap. With no key or {@code ai.primary=KEYWORD} a run does nothing. Never throws.
 */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class EmbeddingBackfillJob implements SchedulingConfigurer {

    private static final int FIRST_RUN_DELAY_SECONDS = 15;
    private static final Logger log = LoggerFactory.getLogger(EmbeddingBackfillJob.class);

    private final EmbeddingService embeddings;
    private final ConfigService config;

    public EmbeddingBackfillJob(EmbeddingService embeddings, ConfigService config) {
        this.embeddings = embeddings;
        this.config = config;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        registrar.addTriggerTask(this::run, context -> {
            Instant last = context.lastCompletion();
            if (last == null) {
                return context.getClock().instant().plusSeconds(FIRST_RUN_DELAY_SECONDS);
            }
            return last.plusSeconds(config.current().intValue(ConfigKey.EMBEDDING_BACKFILL_INTERVAL_SECONDS));
        });
    }

    void run() {
        try {
            int done = embeddings.backfill();
            if (done > 0) {
                log.info("Embedding backfill: {} incident(s) embedded, {} of {} now have a vector", done,
                        embeddings.embeddedCount(), embeddings.incidentCount());
            }
        } catch (RuntimeException ex) {
            log.error("Embedding backfill failed", ex);
        }
    }
}
