package com.iitsm.domain.assignment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;
import java.util.List;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.priority.Priority;
import org.junit.jupiter.api.Test;

class WorkloadTrackerTest {
    private Incident incident(Priority priority, IncidentStatus status) {
        var incident=mock(Incident.class);
        when(incident.getPriority()).thenReturn(priority);
        when(incident.getStatus()).thenReturn(status);
        return incident;
    }

    @Test void four_priorities_have_weight_four_three_two_one() {
        assertEquals(10,WorkloadTracker.loadOf(List.of(
                incident(Priority.P1,IncidentStatus.ASSIGNED),
                incident(Priority.P2,IncidentStatus.ACKNOWLEDGED),
                incident(Priority.P3,IncidentStatus.IN_PROGRESS),
                incident(Priority.P4,IncidentStatus.PENDING_USER_INFO))));
    }

    @Test void resolved_closed_and_unassigned_work_do_not_count() {
        assertEquals(0,WorkloadTracker.loadOf(List.of(
                incident(Priority.P1,IncidentStatus.RESOLVED),
                incident(Priority.P1,IncidentStatus.CLOSED),
                incident(Priority.P1,IncidentStatus.CLASSIFIED),
                incident(null,IncidentStatus.ASSIGNED))));
    }

    @Test void reopened_incident_counts_as_active_work() {
        assertEquals(4,WorkloadTracker.loadOf(List.of(incident(Priority.P1,IncidentStatus.REOPENED))));
    }
}
