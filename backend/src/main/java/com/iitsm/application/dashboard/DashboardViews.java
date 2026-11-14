package com.iitsm.application.dashboard;

import java.time.Instant;
import java.util.List;

import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.application.report.ReportViews.LabelCount;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.notification.NotificationEventType;
import com.iitsm.domain.priority.Priority;

/** The objects of the live dashboard (API Data Dictionary C.8 and B.5). */
public final class DashboardViews {

    private DashboardViews() {
    }

    /**
     * One incident event, on {@code /topic/dashboard} and in {@code recentEvents}.
     *
     * @param type   a NotificationEventType value (C.8)
     * @param status the incident's status after the event
     */
    public record DashboardEvent(NotificationEventType type, Long incidentId, String code, Priority priority,
                                 IncidentStatus status, Instant at) {
    }

    /** The counters of the dashboard: the definitions of {@code /reports/overview} over every incident. */
    public record Counters(long total, long open, long critical, long resolved, long slaViolations) {
    }

    /**
     * The second message shape on {@code /topic/dashboard} (decision DEC-81): the counters, pushed after each change
     * (at most once a second) and on a fixed interval. {@code type} is always {@code COUNTERS}.
     */
    public record CountersMessage(String type, Counters counters, List<LabelCount> byPriority, Instant at) {

        public static final String TYPE = "COUNTERS";

        public CountersMessage(Counters counters, List<LabelCount> byPriority, Instant at) {
            this(TYPE, counters, List.copyOf(byPriority), at);
        }
    }

    /**
     * {@code GET /dashboard/live}: the first load of the dashboard; later changes arrive on the topic.
     *
     * @param byPriority   open incidents per priority, P1 to P4 (zero when none), then UNSET if any
     * @param recentEvents the last 20 events, newest first
     * @param atRisk       up to 10 open incidents nearest to missing their SLA
     */
    public record LiveDashboard(Counters counters, List<LabelCount> byPriority, List<DashboardEvent> recentEvents,
                                List<IncidentSummary> atRisk) {
    }
}
