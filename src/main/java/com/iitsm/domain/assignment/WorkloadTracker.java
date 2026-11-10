package com.iitsm.domain.assignment;

import java.util.Collection;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;

/**
 * Weighted workload of a technician (handbook 1.7): each active incident counts by priority, P1 4, P2 3, P3 2,
 * P4 1. A technician at or above max_load takes no new work.
 */
public final class WorkloadTracker {

    private WorkloadTracker() {
    }

    /** Sums the weights of the incidents that are still being worked on; others are ignored. */
    public static int loadOf(Collection<Incident> incidents) {
        return incidents.stream()
                .filter(incident -> IncidentStatus.ACTIVE_WORK.contains(incident.getStatus()))
                .filter(incident -> incident.getPriority() != null)
                .mapToInt(incident -> incident.getPriority().workloadWeight())
                .sum();
    }
}
