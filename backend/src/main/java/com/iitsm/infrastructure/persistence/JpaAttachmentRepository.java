package com.iitsm.infrastructure.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.iitsm.domain.attachment.IncidentAttachment;
import com.iitsm.domain.repository.AttachmentRepository;

/** Spring Data implementation of the domain {@link AttachmentRepository}. */
public interface JpaAttachmentRepository extends JpaRepository<IncidentAttachment, Long>, AttachmentRepository {

    @Override
    @Query("select a from IncidentAttachment a join fetch a.incident join fetch a.uploadedBy where a.id = :id")
    Optional<IncidentAttachment> findWithIncident(@Param("id") Long id);

    @Override
    @Query("select a from IncidentAttachment a join fetch a.uploadedBy where a.incident.id = :incidentId "
            + "order by a.createdAt, a.id")
    List<IncidentAttachment> findByIncident(@Param("incidentId") Long incidentId);

    @Override
    @Query("select count(a) from IncidentAttachment a where a.incident.id = :incidentId")
    long countByIncident(@Param("incidentId") Long incidentId);
}
