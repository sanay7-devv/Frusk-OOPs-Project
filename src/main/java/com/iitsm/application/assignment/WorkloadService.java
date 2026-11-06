package com.iitsm.application.assignment;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.assignment.WorkloadTracker;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.repository.IncidentRepository;

/** Weighted workload of every technician, computed from one query over the active incidents. */
@Service
public class WorkloadService {

    /** Weighted load points (P1 4, P2 3, P3 2, P4 1) and number of active incidents of one technician. */
    public record Workload(int load, int activeIncidents) {
        public static final Workload NONE = new Workload(0, 0);
    }

    private final IncidentRepository incidents;

    public WorkloadService(IncidentRepository incidents) {
        this.incidents = incidents;
    }

    /** Technician id to workload; technicians with no active incident are absent (use {@link Workload#NONE}). */
    @Transactional(readOnly = true)
    public Map<Long, Workload> all() {
        Map<Long, List<Incident>> byAssignee = new HashMap<>();
        for (Incident incident : incidents.findByAssigneeIsNotNullAndStatusIn(IncidentStatus.ACTIVE_WORK)) {
            byAssignee.computeIfAbsent(incident.getAssignee().getId(), k -> new ArrayList<>()).add(incident);
        }
        Map<Long, Workload> result = new HashMap<>();
        byAssignee.forEach((id, list) -> result.put(id, new Workload(WorkloadTracker.loadOf(list), list.size())));
        return result;
    }
}
