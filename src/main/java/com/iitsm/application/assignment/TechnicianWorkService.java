package com.iitsm.application.assignment;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.incident.IncidentViewMapper;
import com.iitsm.domain.assignment.WorkloadTracker;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.incident.SlaClockType;
import com.iitsm.domain.incident.SlaState;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.domain.user.TechnicianRole;
import com.iitsm.domain.user.User;

/** A technician's own view of their work: GET /technicians/me/workload (API Data Dictionary C.5). */
@Service
public class TechnicianWorkService {

    public record Deadline(Long incidentId, String code, SlaClockType type, Instant due, SlaState slaState) {
    }

    public record WorkloadView(int load, int maxLoad, int activeIncidents, long resolvedThisWeek,
                               List<Deadline> upcomingDeadlines) {
    }

    private static final int UPCOMING = 10;

    private final UserRepository users;
    private final IncidentRepository incidents;
    private final IncidentViewMapper views;
    private final Clock clock;

    public TechnicianWorkService(UserRepository users, IncidentRepository incidents, IncidentViewMapper views,
                                 Clock clock) {
        this.users = users;
        this.incidents = incidents;
        this.views = views;
        this.clock = clock;
    }

    /** Load, capacity, resolved in the last 7 days, and the next 10 open SLA deadlines, soonest first. */
    @Transactional(readOnly = true)
    public WorkloadView workload(Long technicianId) {
        User user = users.findById(technicianId).orElseThrow(() -> new UserNotFoundException(technicianId));
        TechnicianProfile profile = user.technicianRole().map(TechnicianRole::getProfile)
                .orElseThrow(() -> new InputValidationException("id", "you are not a technician"));
        List<Incident> active = incidents.findByAssignee_IdAndStatusIn(technicianId, IncidentStatus.ACTIVE_WORK);
        Instant now = clock.instant();
        long resolvedThisWeek = incidents.countByAssignee_IdAndResolvedAtAfter(technicianId,
                now.minus(Duration.ofDays(7)));

        IncidentViewMapper.SummaryBuilder summaries = views.summaries();
        List<Deadline> deadlines = new ArrayList<>();
        for (Incident incident : active) {
            SlaState state = summaries.summary(incident).slaState();
            if (incident.getAcknowledgedAt() == null && incident.getSla().getResponseDue() != null) {
                deadlines.add(new Deadline(incident.getId(), incident.getCode(), SlaClockType.RESPONSE,
                        incident.getSla().getResponseDue(), state));
            }
            if (!incident.getSla().isPaused() && incident.getSla().getResolutionDue() != null) {
                deadlines.add(new Deadline(incident.getId(), incident.getCode(), SlaClockType.RESOLUTION,
                        incident.getSla().getResolutionDue(), state));
            }
        }
        deadlines.sort(Comparator.comparing(Deadline::due));
        return new WorkloadView(WorkloadTracker.loadOf(active), profile.getMaxLoad(), active.size(),
                resolvedThisWeek, deadlines.stream().limit(UPCOMING).toList());
    }
}
