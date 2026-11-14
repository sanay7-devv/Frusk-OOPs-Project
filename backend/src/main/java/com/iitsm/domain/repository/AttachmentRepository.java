package com.iitsm.domain.repository;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.attachment.IncidentAttachment;

/** Repository pattern: attachment rows (incident_attachments). */
public interface AttachmentRepository {

    IncidentAttachment save(IncidentAttachment attachment);

    /** With the incident and the uploader loaded. */
    Optional<IncidentAttachment> findWithIncident(Long id);

    /** One incident's attachments, oldest first, uploader loaded. */
    List<IncidentAttachment> findByIncident(Long incidentId);

    long countByIncident(Long incidentId);
}
