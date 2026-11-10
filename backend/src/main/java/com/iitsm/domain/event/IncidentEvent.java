package com.iitsm.domain.event;

import java.time.Instant;

/**
 * Something that happened to an incident (Observer pattern, handbook 2.6). Events are small immutable records
 * published by the application services; audit, notifications, SLA and dashboard react to them independently.
 */
public interface IncidentEvent {

    Long incidentId();

    String incidentCode();

    Instant occurredAt();
}
