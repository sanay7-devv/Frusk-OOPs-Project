package com.iitsm.application.feedback;

import java.time.Clock;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.incident.IncidentAccessPolicy;
import com.iitsm.domain.exception.IncidentNotFoundException;
import com.iitsm.domain.exception.InvalidStateTransitionException;
import com.iitsm.domain.feedback.Feedback;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;
import com.iitsm.domain.repository.FeedbackRepository;
import com.iitsm.domain.repository.IncidentRepository;

/**
 * The reporter rates a resolved incident, once (API Data Dictionary B.4 POST /incidents/{id}/feedback). Order of
 * answers follows decision DEC-20: a stranger gets 404, a viewer who is not the reporter gets 403, and a wrong
 * moment (not resolved yet, or already rated) gets 409.
 */
@Service
public class FeedbackService {

    private final IncidentRepository incidents;
    private final FeedbackRepository feedback;
    private final IncidentAccessPolicy access;
    private final Clock clock;

    public FeedbackService(IncidentRepository incidents, FeedbackRepository feedback, IncidentAccessPolicy access,
                           Clock clock) {
        this.incidents = incidents;
        this.feedback = feedback;
        this.access = access;
        this.clock = clock;
    }

    @Transactional
    public FeedbackView give(AuthenticatedUser caller, Long incidentId, int rating, String comment) {
        Incident incident = incidents.findById(incidentId)
                .filter(i -> access.canView(caller, i))
                .orElseThrow(() -> new IncidentNotFoundException(incidentId));
        access.require(caller, incident, IncidentAction.GIVE_FEEDBACK);
        String status = incident.getStatus().name();
        if (!incident.getStatus().isResolvedOrLater()) {
            throw new InvalidStateTransitionException(status, IncidentAction.GIVE_FEEDBACK.name(),
                    "feedback is possible once the incident is resolved");
        }
        if (feedback.findByIncidentId(incidentId).isPresent()) {
            throw alreadyRated(status);
        }
        try {
            return FeedbackView.of(feedback.saveAndFlush(new Feedback(incident, rating, comment, clock.instant())));
        } catch (DataIntegrityViolationException ex) {
            // two submissions at the same moment: the primary key lets exactly one through
            throw alreadyRated(status);
        }
    }

    private static InvalidStateTransitionException alreadyRated(String status) {
        return new InvalidStateTransitionException(status, IncidentAction.GIVE_FEEDBACK.name(),
                "feedback was already given for this incident");
    }
}
