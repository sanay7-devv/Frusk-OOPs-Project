package com.iitsm.domain.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.priority.Priority;

/**
 * Repository pattern: the read-only queries of the live dashboard, the service graph and the service status board
 * (module M13). Every number is one GROUP BY in the database, over all incidents (these views are not per caller).
 */
public interface DashboardRepository {

    /** Open incidents of one service and priority (priority null while it is not computed yet). */
    record OpenCount(Long serviceId, Priority priority, long count) {
    }

    /** The code, priority and status of an incident right now. */
    record IncidentHeader(Long incidentId, String code, Priority priority, IncidentStatus status) {
    }

    /**
     * One audit record about an incident, with the incident's code and current priority.
     *
     * @param status the status the action left the incident in, or its current status when the action kept it
     */
    record RecentAction(AuditAction action, Long incidentId, String code, Priority priority, IncidentStatus status,
                        Instant at) {
    }

    /** Open incidents (NEW to REOPENED) grouped by service and priority. */
    List<OpenCount> openIncidentsByServiceAndPriority();

    Optional<IncidentHeader> header(Long incidentId);

    /** The newest audit records about incidents with one of the given actions, newest first. */
    List<RecentAction> recentActions(Collection<AuditAction> actions, int limit);

    /**
     * Open incidents whose SLA is not yet violated and that either got an SLA warning or are in {@code flaggedIds}
     * (the SLA risk scan), nearest resolution deadline first.
     */
    List<Incident> atRisk(Collection<Long> flaggedIds, int limit);
}
