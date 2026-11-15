package com.iitsm.application.dashboard;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.dashboard.DashboardViews.Counters;
import com.iitsm.application.dashboard.DashboardViews.CountersMessage;
import com.iitsm.application.dashboard.DashboardViews.DashboardEvent;
import com.iitsm.application.dashboard.DashboardViews.LiveDashboard;
import com.iitsm.application.incident.IncidentViewMapper;
import com.iitsm.application.intelligence.SlaRiskService;
import com.iitsm.application.report.ReportViews.LabelCount;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.notification.NotificationEventType;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.report.ReportRows;
import com.iitsm.domain.report.ReportScope;
import com.iitsm.domain.repository.DashboardRepository;
import com.iitsm.domain.repository.DashboardRepository.OpenCount;
import com.iitsm.domain.repository.ReportRepository;

/**
 * The live administrator dashboard (handbook 2.5 M13, API Data Dictionary C.8). The first load comes from
 * {@link #live()}; after that {@link DashboardListener} pushes each incident event and this service pushes the
 * counters, at most once a second after a change and on a fixed interval when nothing happens (decision DEC-81).
 * <p>
 * Counters use the definitions of {@code /reports/overview} over every incident (one query in
 * {@link ReportRepository}), so the dashboard and the overview report can never disagree. Recent events are read
 * back from the audit trail, so they survive a restart and match what was pushed.
 */
@Service
public class DashboardService {

    static final int RECENT_EVENTS = 20;
    static final int AT_RISK = 10;
    private static final ReportScope EVERYTHING = new ReportScope(null, null, null);

    private final ReportRepository reports;
    private final DashboardRepository dashboard;
    private final IncidentViewMapper views;
    private final SlaRiskService risk;
    private final DashboardPublisher publisher;
    private final Clock clock;

    /** Set by every pushed event; cleared when the counters go out. */
    private final AtomicBoolean changed = new AtomicBoolean(false);
    private volatile Instant lastCountersPush = Instant.EPOCH;

    public DashboardService(ReportRepository reports, DashboardRepository dashboard, IncidentViewMapper views,
                            SlaRiskService risk, DashboardPublisher publisher, Clock clock) {
        this.reports = reports;
        this.dashboard = dashboard;
        this.views = views;
        this.risk = risk;
        this.publisher = publisher;
        this.clock = clock;
    }

    /**
     * The dashboard event type of an audit action: the notification type of DEC-54, plus the two SLA actions. Pipeline
     * steps (classified, priority calculated, work started, comment added) give none and are not shown.
     */
    public static Optional<NotificationEventType> typeOf(AuditAction action) {
        return switch (action) {
            case SLA_WARNING -> Optional.of(NotificationEventType.SLA_WARNING);
            case SLA_VIOLATED -> Optional.of(NotificationEventType.SLA_VIOLATED);
            default -> NotificationEventType.forAction(action);
        };
    }

    private static Set<AuditAction> shownActions() {
        Set<AuditAction> shown = EnumSet.noneOf(AuditAction.class);
        for (AuditAction action : AuditAction.values()) {
            if (typeOf(action).isPresent()) {
                shown.add(action);
            }
        }
        return shown;
    }

    @Transactional(readOnly = true)
    public LiveDashboard live() {
        List<DashboardEvent> recent = new ArrayList<>();
        for (DashboardRepository.RecentAction a : dashboard.recentActions(shownActions(), RECENT_EVENTS)) {
            recent.add(new DashboardEvent(typeOf(a.action()).orElseThrow(), a.incidentId(), a.code(), a.priority(),
                    a.status(), a.at()));
        }
        IncidentViewMapper.SummaryBuilder summaries = views.summaries();
        return new LiveDashboard(counters(), openByPriority(), recent,
                dashboard.atRisk(risk.flaggedIds(), AT_RISK).stream().map(summaries::summary).toList());
    }

    /** The event to push for an incident, with its current code, priority and status; empty if it is gone. */
    @Transactional(readOnly = true)
    public Optional<DashboardEvent> eventFor(NotificationEventType type, Long incidentId, Instant at) {
        return dashboard.header(incidentId)
                .map(h -> new DashboardEvent(type, h.incidentId(), h.code(), h.priority(), h.status(), at));
    }

    /** Pushes one event and marks the counters for the next tick. */
    public void push(DashboardEvent event) {
        publisher.publish(event);
        changed.set(true);
    }

    /**
     * Called every second by the counters job: pushes the counters when something changed since the last push, or
     * when {@code intervalSeconds} passed without a push.
     *
     * @return true if counters were pushed
     */
    @Transactional(readOnly = true)
    public boolean pushCountersIfDue(int intervalSeconds) {
        Instant now = clock.instant();
        boolean due = changed.getAndSet(false) || !now.isBefore(lastCountersPush.plusSeconds(intervalSeconds));
        if (!due) {
            return false;
        }
        lastCountersPush = now;
        publisher.publish(new CountersMessage(counters(), openByPriority(), now));
        return true;
    }

    public Counters counters() {
        ReportRows.Overview o = reports.overview(EVERYTHING);
        return new Counters(o.total(), o.open(), o.critical(), o.resolved(), o.slaViolations());
    }

    /** Open incidents per priority (decision DEC-81): P1 to P4 always, UNSET only when some have no priority. */
    public List<LabelCount> openByPriority() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Priority p : Priority.values()) {
            counts.put(p.name(), 0L);
        }
        for (OpenCount c : dashboard.openIncidentsByServiceAndPriority()) {
            counts.merge(c.priority() == null ? "UNSET" : c.priority().name(), c.count(), Long::sum);
        }
        return counts.entrySet().stream().map(e -> new LabelCount(e.getKey(), e.getValue())).toList();
    }
}
