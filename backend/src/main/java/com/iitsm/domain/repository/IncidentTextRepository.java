package com.iitsm.domain.repository;

import java.time.Instant;
import java.util.List;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.intelligence.LabelledText;

/**
 * Repository pattern: the read-only queries of module M12 (similarity, suggested resolutions, TF-IDF corpus). Kept
 * apart from {@link IncidentRepository} so the intelligence module adds no methods to the incident aggregate's
 * repository.
 */
public interface IncidentTextRepository {

    /** Open incidents of one service created in [from, to], newest first, without the incident {@code excludeId}. */
    List<Incident> findOpenOnService(Long serviceId, Instant from, Instant to, Long excludeId);

    /** Incidents resolved since a moment that carry a resolution, newest first, optionally of one service. */
    List<Incident> findResolved(Long serviceIdOrNull, Instant since, int limit);

    /** Title and description of the incidents created since a moment, newest first (the TF-IDF corpus). */
    List<String> findRecentTexts(Instant since, int limit);

    /** Incidents created since a moment that have a category, with the category id and their text. */
    List<LabelledText> findCategorisedTexts(Instant since, int limit);
}
