package com.iitsm.domain.audit;

import java.time.Instant;

import com.iitsm.domain.incident.IncidentStatus;

/**
 * The content of one audit record as it is sealed: every column of {@code audit_records}, with the actor and the
 * incident as plain ids (no lazy loading, no entities). Sealing and verifying both rebuild this from the database, so
 * they hash exactly what is stored there (S3, DEC-44).
 */
public record AuditFacts(Long id, Instant createdAt, Long actorId, AuditAction action, Long incidentId,
                         IncidentStatus previousState, IncidentStatus newState, String description) {
}
