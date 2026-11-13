package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.feedback.Feedback;
import com.iitsm.domain.repository.FeedbackRepository;

/** Spring Data implementation of the domain {@link FeedbackRepository}; the incident id is the key. */
public interface JpaFeedbackRepository extends JpaRepository<Feedback, Long>, FeedbackRepository {

    @Override
    default java.util.Optional<Feedback> findByIncidentId(Long incidentId) {
        return findById(incidentId);
    }
}
