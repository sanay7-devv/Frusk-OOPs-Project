package com.iitsm.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iitsm.domain.incident.IncidentComment;
import com.iitsm.domain.repository.IncidentCommentRepository;

/** Spring Data implementation of the domain {@link IncidentCommentRepository}. */
public interface JpaIncidentCommentRepository extends JpaRepository<IncidentComment, Long>, IncidentCommentRepository {
}
