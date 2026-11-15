package com.iitsm.domain.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.iitsm.domain.intelligence.TextRecord;

/** Repository pattern: the vectors in {@code incident_embeddings} (module M12, DEC-M12-10). */
public interface EmbeddingRepository {

    /** Inserts or replaces the vector of an incident. */
    void save(Long incidentId, double[] vector, String model, Instant now);

    /** The vectors of these incidents that were made by {@code model}; incidents without one are absent. */
    Map<Long, double[]> findVectors(Collection<Long> incidentIds, String model);

    Optional<double[]> findVector(Long incidentId, String model);

    /** The incident's current text (no vector), or empty if it does not exist. */
    Optional<TextRecord> findText(Long incidentId);

    /** Newest incidents with no vector, or one from another model, at most {@code limit}. */
    List<TextRecord> findPending(String model, int limit);

    long countEmbedded(String model);

    long countIncidents();
}
