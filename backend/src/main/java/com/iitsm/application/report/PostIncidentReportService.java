package com.iitsm.application.report;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.incident.IncidentAccessPolicy;
import com.iitsm.application.incident.IncidentViewMapper;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.application.report.ReportViews.PersonInvolved;
import com.iitsm.application.report.ReportViews.PostIncidentReport;
import com.iitsm.application.report.ReportViews.ResolutionSummary;
import com.iitsm.application.report.ReportViews.SlaOutcome;
import com.iitsm.application.report.ReportViews.SlaViolationEntry;
import com.iitsm.application.report.ReportViews.StatusDuration;
import com.iitsm.application.report.ReportViews.TimelineEntry;
import com.iitsm.domain.audit.AuditRecord;
import com.iitsm.domain.exception.IncidentNotFoundException;
import com.iitsm.domain.feedback.Feedback;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.incident.Resolution;
import com.iitsm.domain.incident.SlaState;
import com.iitsm.domain.repository.AuditRepository;
import com.iitsm.domain.repository.FeedbackRepository;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.SlaViolationRepository;
import com.iitsm.domain.sla.SlaViolation;
import com.iitsm.domain.user.User;

/**
 * E4 post-incident report (decision DEC-47, DEC-64): the whole story of one incident computed from the audit trail
 * (timeline, wall-clock time in each status, people involved) plus the SLA outcome and the resolution. Visible to
 * whoever may see the incident; a reporter without staff rights does not get internal-note entries, as in the
 * history endpoint. The PDF is drawn by a {@link PostIncidentPdfRenderer} (Adapter, so the library stays outside).
 */
@Service
public class PostIncidentReportService {

    private final IncidentRepository incidents;
    private final AuditRepository audit;
    private final SlaViolationRepository violations;
    private final FeedbackRepository feedback;
    private final IncidentAccessPolicy access;
    private final IncidentViewMapper views;
    private final PostIncidentPdfRenderer renderer;
    private final Clock clock;

    public PostIncidentReportService(IncidentRepository incidents, AuditRepository audit,
                                     SlaViolationRepository violations, FeedbackRepository feedback,
                                     IncidentAccessPolicy access, IncidentViewMapper views,
                                     PostIncidentPdfRenderer renderer, Clock clock) {
        this.incidents = incidents;
        this.audit = audit;
        this.violations = violations;
        this.feedback = feedback;
        this.access = access;
        this.views = views;
        this.renderer = renderer;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PostIncidentReport report(AuthenticatedUser caller, Long incidentId) {
        Incident incident = incidents.findById(incidentId)
                .filter(i -> access.canView(caller, i))
                .orElseThrow(() -> new IncidentNotFoundException(incidentId));
        Instant now = clock.instant();
        boolean seesInternal = !incident.isReportedBy(caller.id()) || access.seesAll(caller);
        List<AuditRecord> trail = audit.findByIncident(incident.getId());

        List<TimelineEntry> timeline = trail.stream()
                .filter(r -> seesInternal || !r.isInternal())
                .map(r -> new TimelineEntry(r.getCreatedAt(), ref(r.getActor()), r.getAction().name(),
                        r.getPreviousState(), r.getNewState(), r.getDescription()))
                .toList();

        Instant end = incident.getClosedAt() != null ? incident.getClosedAt()
                : incident.getStatus().isResolvedOrLater() && incident.getResolvedAt() != null
                ? incident.getResolvedAt() : now;
        Resolution resolution = incident.getResolution();
        Integer satisfaction = feedback.findByIncidentId(incident.getId()).map(Feedback::getRating).orElse(null);
        return new PostIncidentReport(incident.getId(), incident.getCode(), incident.getTitle(), incident.getStatus(),
                incident.getPriority(), new Ref(incident.getService().getId(), incident.getService().getName()),
                incident.getCategory() == null ? null
                        : new Ref(incident.getCategory().getId(), incident.getCategory().getName()),
                incident.getCreatedAt(), incident.getResolvedAt(), incident.getClosedAt(), incident.getReopenCount(),
                incident.getStatus().isResolvedOrLater(), now, Duration.between(incident.getCreatedAt(), end).toSeconds(),
                slaOutcome(incident, now), timeInStatus(incident, trail, now), people(incident, trail),
                resolution != null && resolution.isPresent()
                        ? new ResolutionSummary(resolution.getRootCause(), resolution.getNotes(),
                        resolution.getSteps(), resolution.getTimeSpentMinutes()) : null,
                satisfaction, timeline);
    }

    @Transactional(readOnly = true)
    public byte[] pdf(AuthenticatedUser caller, Long incidentId) {
        return renderer.render(report(caller, incidentId));
    }

    /**
     * Walks the audit trail in order; every entry that changes the status closes the previous stay. The stay in the
     * current status runs to now, except CLOSED, which is final and has no duration to count.
     */
    private static List<StatusDuration> timeInStatus(Incident incident, List<AuditRecord> trail, Instant now) {
        Map<IncidentStatus, long[]> totals = new LinkedHashMap<>();
        IncidentStatus current = IncidentStatus.NEW;
        Instant since = incident.getCreatedAt();
        totals.put(current, new long[] {0, 1});
        for (AuditRecord r : trail) {
            IncidentStatus next = r.getNewState();
            if (next == null || next == current) {
                continue;
            }
            totals.get(current)[0] += Math.max(0, Duration.between(since, r.getCreatedAt()).toSeconds());
            current = next;
            since = r.getCreatedAt();
            totals.computeIfAbsent(current, k -> new long[2])[1]++;
        }
        boolean terminal = current == IncidentStatus.CLOSED;
        if (!terminal) {
            totals.get(current)[0] += Math.max(0, Duration.between(since, now).toSeconds());
        }
        List<StatusDuration> result = new ArrayList<>();
        IncidentStatus last = current;
        totals.forEach((status, t) -> result.add(new StatusDuration(status, t[0], (int) t[1],
                status == last && !terminal)));
        return result;
    }

    private SlaOutcome slaOutcome(Incident incident, Instant now) {
        SlaState state = views.summaries().summary(incident).slaState();
        Instant responseDue = incident.getSla().getResponseDue();
        Instant resolutionDue = incident.getSla().getResolutionDue();
        Instant acknowledgedAt = incident.getAcknowledgedAt();
        Instant resolvedAt = incident.getResolvedAt();
        Boolean responseMet = outcomeOf(acknowledgedAt, responseDue, now, false);
        Boolean resolutionMet = outcomeOf(resolvedAt, resolutionDue, now, incident.getSla().isPaused());
        List<SlaViolationEntry> entries = new ArrayList<>();
        for (SlaViolation v : violations.findByIncident_IdOrderByCreatedAtAsc(incident.getId())) {
            entries.add(new SlaViolationEntry(v.getType().name(), v.getOverdueSeconds(), v.getCreatedAt(),
                    ref(v.getTechnician())));
        }
        String outcome = state == SlaState.MET || state == SlaState.VIOLATED ? state.name() : state.name() + " (open)";
        return new SlaOutcome(state, outcome, responseDue, acknowledgedAt, responseMet, resolutionDue, resolvedAt,
                resolutionMet, entries);
    }

    /** Met if done by the deadline, missed if done late or still open past it, null while still inside the deadline. */
    private static Boolean outcomeOf(Instant doneAt, Instant due, Instant now, boolean paused) {
        if (due == null) {
            return null;
        }
        if (doneAt != null) {
            return !doneAt.isAfter(due);
        }
        return now.isAfter(due) && !paused ? Boolean.FALSE : null;
    }

    /** The reporter, the current assignee, and everyone who appears as an actor in the trail, with what they did. */
    private static List<PersonInvolved> people(Incident incident, List<AuditRecord> trail) {
        Map<Long, User> byId = new LinkedHashMap<>();
        Map<Long, Set<String>> roles = new LinkedHashMap<>();
        Map<Long, Integer> actions = new LinkedHashMap<>();
        byId.put(incident.getReporter().getId(), incident.getReporter());
        roles.computeIfAbsent(incident.getReporter().getId(), k -> new LinkedHashSet<>()).add("REPORTER");
        if (incident.getAssignee() != null) {
            User assignee = incident.getAssignee();
            byId.put(assignee.getId(), assignee);
            roles.computeIfAbsent(assignee.getId(), k -> new LinkedHashSet<>()).add("ASSIGNEE");
        }
        for (AuditRecord r : trail) {
            User actor = r.getActor();
            if (actor == null) {
                continue;
            }
            byId.putIfAbsent(actor.getId(), actor);
            roles.computeIfAbsent(actor.getId(), k -> new LinkedHashSet<>());
            actions.merge(actor.getId(), 1, Integer::sum);
        }
        for (Map.Entry<Long, Set<String>> e : roles.entrySet()) {
            if (e.getValue().isEmpty()) {
                e.getValue().add("PARTICIPANT");
            }
        }
        return byId.values().stream()
                .map(u -> new PersonInvolved(new Ref(u.getId(), u.getName()), List.copyOf(roles.get(u.getId())),
                        actions.getOrDefault(u.getId(), 0)))
                .toList();
    }

    private static Ref ref(User user) {
        return user == null ? null : new Ref(user.getId(), user.getName());
    }
}
