package com.iitsm.domain.event;

import java.time.Instant;

import com.iitsm.domain.priority.Priority;

/**
 * The risk scan found an incident whose SLA risk score reached the flag threshold (module M12). Published once when
 * an incident first crosses it (and again only after it dropped below and rose again), so a listener such as the
 * notification module can warn the assignee without repeating itself every scan.
 */
public record SlaAtRisk(Long incidentId, String incidentCode, Priority priority, double score, Long assigneeId,
                        Instant occurredAt) implements IncidentEvent {
}
