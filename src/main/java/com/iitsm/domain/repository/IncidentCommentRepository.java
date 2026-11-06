package com.iitsm.domain.repository;

import java.util.List;

import com.iitsm.domain.incident.IncidentComment;

/** Repository pattern: storage of incident comments. */
public interface IncidentCommentRepository {

    List<IncidentComment> findByIncident_IdOrderByCreatedAtAsc(Long incidentId);

    IncidentComment save(IncidentComment comment);
}
