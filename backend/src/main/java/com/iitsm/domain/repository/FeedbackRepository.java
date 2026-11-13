package com.iitsm.domain.repository;

import java.util.Optional;

import com.iitsm.domain.feedback.Feedback;

/** Repository pattern: storage of feedback (one row per incident). */
public interface FeedbackRepository {

    Optional<Feedback> findByIncidentId(Long incidentId);

    /** Writes at once, so a duplicate (second rating, race) fails inside the service call and not at commit. */
    Feedback saveAndFlush(Feedback feedback);
}
