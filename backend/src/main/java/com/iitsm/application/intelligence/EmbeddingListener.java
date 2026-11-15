package com.iitsm.application.intelligence;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.event.IncidentChanged;

/**
 * Observer: embeds a new incident <b>after its transaction commits</b>, on its own single thread
 * ({@code embeddingExecutor}), so creating an incident never waits for the embedding API. A failure is logged and
 * goes no further; the backfill job picks the incident up later.
 */
@Component
public class EmbeddingListener {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingListener.class);

    private final EmbeddingService embeddings;

    public EmbeddingListener(EmbeddingService embeddings) {
        this.embeddings = embeddings;
    }

    @Async("embeddingExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(IncidentChanged event) {
        if (event.action() != AuditAction.INCIDENT_CREATED) {
            return;
        }
        try {
            embeddings.embedIncident(event.incidentId());
        } catch (RuntimeException ex) {
            log.warn("Could not embed incident {}: {}", event.incidentCode(), ex.toString());
        }
    }
}
