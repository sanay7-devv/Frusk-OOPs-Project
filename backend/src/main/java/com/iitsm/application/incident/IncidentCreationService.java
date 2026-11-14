package com.iitsm.application.incident;

import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.incident.IncidentViews.IncidentDetail;
import com.iitsm.application.intelligence.IntelligenceService;
import com.iitsm.application.intelligence.IntelligenceViews.MatchKind;
import com.iitsm.application.intelligence.IntelligenceViews.SimilarIncidentView;
import com.iitsm.application.problem.ProblemCorrelator;
import com.iitsm.domain.exception.DuplicateIncidentException;
import com.iitsm.domain.exception.SimilarIncidentRef;
import com.iitsm.domain.intelligence.CategorySuggestion;

/**
 * The front half of the creation pipeline (handbook M4, decisions DEC-70 and DEC-71): ask the intelligence engine,
 * then let {@link IncidentService#create} run its single transaction, then group the new incident.
 * <ol>
 *   <li><b>Duplicate check.</b> Open incidents on the same service inside the look-back window are compared with
 *       the draft. A match at the duplicate threshold or more is 409 DUPLICATE_INCIDENT with every match at the
 *       related threshold or more, unless the reporter confirmed it is not a duplicate.</li>
 *   <li><b>Category.</b> None given: the engine's suggestion is applied if confident enough, else the incident waits
 *       in triage.</li>
 *   <li><b>Create</b> in one transaction (classify, priority, SLA, assignment, audit).</li>
 *   <li><b>Correlate:</b> group it under a problem record (same-service match or neighbouring-service outage). A
 *       failure here never undoes the incident: it is logged and the incident stays ungrouped.</li>
 * </ol>
 * This class is deliberately not transactional: the model call of step 2 can take seconds and must not hold a
 * database connection (DEC-M12-9).
 */
@Service
public class IncidentCreationService {

    private static final Logger log = LoggerFactory.getLogger(IncidentCreationService.class);

    private final IncidentService incidents;
    private final IntelligenceService intelligence;
    private final ProblemCorrelator correlator;

    public IncidentCreationService(IncidentService incidents, IntelligenceService intelligence,
                                   ProblemCorrelator correlator) {
        this.incidents = incidents;
        this.intelligence = intelligence;
        this.correlator = correlator;
    }

    public IncidentDetail create(AuthenticatedUser caller, String title, String description, Long serviceId,
                                 Long categoryId, int impact, int urgency, int affectedUsers,
                                 boolean confirmNotDuplicate) {
        List<SimilarIncidentView> similar = unknownService(serviceId)
                ? List.of() : intelligence.similarForCreate(serviceId, title, description);
        if (!confirmNotDuplicate && similar.stream().anyMatch(s -> s.match() == MatchKind.DUPLICATE)) {
            throw new DuplicateIncidentException(similar.stream()
                    .map(s -> new SimilarIncidentRef(s.incidentId(), s.code(), s.title(), s.similarity(),
                            s.status().name()))
                    .toList());
        }
        Long chosen = categoryId;
        String note = null;
        if (chosen == null) {
            CategorySuggestion suggestion = intelligence.categoryToApply(title, description).orElse(null);
            if (suggestion != null) {
                chosen = suggestion.categoryId();
                note = "Classified as %s by the AI suggestion (confidence %.2f, %s)".formatted(
                        suggestion.categoryName(), suggestion.confidence(),
                        suggestion.source().name().toLowerCase(Locale.ROOT));
            }
        }
        IncidentDetail created = incidents.create(caller, title, description, serviceId, chosen, impact, urgency,
                affectedUsers, note);
        try {
            correlator.correlate(created.id(), similar.stream().map(SimilarIncidentView::incidentId).toList());
        } catch (RuntimeException ex) {
            log.warn("Could not group {} under a problem record: {}", created.code(), ex.toString());
        }
        return incidents.detail(caller, created.id());
    }

    /** An unknown service is reported by the create step itself (404 SERVICE_NOT_FOUND), not by the check. */
    private boolean unknownService(Long serviceId) {
        try {
            intelligence.requireService(serviceId);
            return false;
        } catch (RuntimeException ex) {
            return true;
        }
    }
}
