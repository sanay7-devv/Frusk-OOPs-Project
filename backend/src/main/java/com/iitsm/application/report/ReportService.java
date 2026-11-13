package com.iitsm.application.report;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.assignment.WorkloadService;
import com.iitsm.application.assignment.WorkloadService.Workload;
import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentAccessPolicy;
import com.iitsm.application.report.ReportViews.LabelCount;
import com.iitsm.application.report.ReportViews.ReportOverview;
import com.iitsm.application.report.ReportViews.ServiceReportRow;
import com.iitsm.application.report.ReportViews.SlaComplianceRow;
import com.iitsm.application.report.ReportViews.TrendPoint;
import com.iitsm.application.report.ReportViews.WorkloadReportRow;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.report.ReportRows;
import com.iitsm.domain.report.ReportScope;
import com.iitsm.domain.repository.ReportRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.domain.user.User;

/**
 * The read-only reports of module M10 (API Data Dictionary C.8). Every number is one COUNT or GROUP BY in the
 * database (decision DEC-42) over the incidents the caller may see: employees count their own, technicians their
 * own and assigned ones, team leads and administrators all of them, the same rule as the incident list.
 */
@Service
public class ReportService {

    private static final Set<String> BUCKETS = Set.of("day", "week");
    private static final Set<String> GROUPS = Set.of("priority", "service", "technician");

    private final ReportRepository reports;
    private final IncidentAccessPolicy access;
    private final ConfigService config;
    private final WorkloadService workloads;
    private final UserRepository users;
    private final Clock clock;

    public ReportService(ReportRepository reports, IncidentAccessPolicy access, ConfigService config,
                         WorkloadService workloads, UserRepository users, Clock clock) {
        this.reports = reports;
        this.access = access;
        this.config = config;
        this.workloads = workloads;
        this.users = users;
        this.clock = clock;
    }

    /** The incidents this caller's reports cover; the range is optional and must not be empty. */
    ReportScope scope(AuthenticatedUser caller, Instant from, Instant to) {
        if (from != null && to != null && !from.isBefore(to)) {
            throw new InputValidationException("to", "must be after from");
        }
        return new ReportScope(access.seesAll(caller) ? null : caller.id(), from, to);
    }

    @Transactional(readOnly = true)
    public ReportOverview overview(AuthenticatedUser caller, Instant from, Instant to) {
        ReportRows.Overview o = reports.overview(scope(caller, from, to));
        return new ReportOverview(o.total(), o.open(), o.critical(), o.resolved(), o.slaViolations(),
                round1(o.avgResolutionMinutes()), o.avgSatisfaction() == null ? null : round1(o.avgSatisfaction()));
    }

    @Transactional(readOnly = true)
    public List<ServiceReportRow> services(AuthenticatedUser caller, Instant from, Instant to) {
        return reports.incidentsPerService(scope(caller, from, to)).stream()
                .map(r -> new ServiceReportRow(r.serviceId(), r.name(), r.count())).toList();
    }

    /** Always lists P1 to P4 (zero when empty), then UNSET if some incident has no priority yet. */
    @Transactional(readOnly = true)
    public List<LabelCount> priorityDistribution(AuthenticatedUser caller, Instant from, Instant to) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Priority p : Priority.values()) {
            counts.put(p.name(), 0L);
        }
        for (ReportRows.LabelCount row : reports.priorityDistribution(scope(caller, from, to))) {
            counts.merge(row.label(), row.count(), Long::sum);
        }
        return counts.entrySet().stream().map(e -> new LabelCount(e.getKey(), e.getValue())).toList();
    }

    @Transactional(readOnly = true)
    public List<LabelCount> categoryDistribution(AuthenticatedUser caller, Instant from, Instant to) {
        return reports.categoryDistribution(scope(caller, from, to)).stream()
                .map(r -> new LabelCount(r.label(), r.count())).toList();
    }

    /**
     * Created and resolved per day or week, with empty buckets filled with zero. Without a range the last 30 days
     * (day) or 12 weeks (week) up to now. Weeks start on Monday; days and weeks are UTC.
     */
    @Transactional(readOnly = true)
    public List<TrendPoint> trends(AuthenticatedUser caller, Instant from, Instant to, String bucket) {
        String unit = bucket == null ? "day" : bucket.toLowerCase(Locale.ROOT);
        if (!BUCKETS.contains(unit)) {
            throw new InputValidationException("bucket", "must be day or week");
        }
        boolean weekly = unit.equals("week");
        Instant end = to != null ? to : clock.instant();
        Instant start = from != null ? from : end.minus(weekly ? Duration.ofDays(84) : Duration.ofDays(30));
        ReportScope scope = scope(caller, start, end);

        LocalDate first = start.atOffset(ZoneOffset.UTC).toLocalDate();
        LocalDate last = end.minusNanos(1).atOffset(ZoneOffset.UTC).toLocalDate();
        if (weekly) {
            first = first.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        }
        long steps = weekly ? ChronoUnit.WEEKS.between(first, last) + 1 : ChronoUnit.DAYS.between(first, last) + 1;
        int maxBuckets = config.current().intValue(ConfigKey.REPORT_TREND_MAX_BUCKETS);
        if (steps > maxBuckets) {
            throw new InputValidationException("from", "the range spans " + steps + " " + unit + "s; at most "
                    + maxBuckets + " are allowed (setting report.trend.max.buckets)");
        }
        Map<LocalDate, ReportRows.TrendPoint> found = new LinkedHashMap<>();
        for (ReportRows.TrendPoint p : reports.trends(scope, start, end, weekly)) {
            found.put(LocalDate.parse(p.date()), p);
        }
        List<TrendPoint> points = new ArrayList<>();
        for (LocalDate day = first; !day.isAfter(last); day = weekly ? day.plusWeeks(1) : day.plusDays(1)) {
            ReportRows.TrendPoint p = found.get(day);
            points.add(new TrendPoint(day, p == null ? 0 : p.created(), p == null ? 0 : p.resolved()));
        }
        return points;
    }

    /** groupBy is priority (default), service or technician. */
    @Transactional(readOnly = true)
    public List<SlaComplianceRow> slaCompliance(AuthenticatedUser caller, Instant from, Instant to, String groupBy) {
        String group = groupBy == null ? "priority" : groupBy.toLowerCase(Locale.ROOT);
        if (!GROUPS.contains(group)) {
            throw new InputValidationException("groupBy", "must be priority, service or technician");
        }
        return reports.slaCompliance(scope(caller, from, to), group.toUpperCase(Locale.ROOT)).stream()
                .map(r -> new SlaComplianceRow(r.label(), r.total(), r.met(), r.violated(),
                        round1(r.compliancePercent())))
                .toList();
    }

    /**
     * Every active technician with their current load. A staff view: the controller needs TEAM_VIEW, because it
     * shows other people's work and not incidents the caller may see.
     */
    @Transactional(readOnly = true)
    public List<WorkloadReportRow> workload() {
        Map<Long, Workload> load = workloads.all();
        Map<Long, Double> resolution = new LinkedHashMap<>();
        reports.averageResolutionPerTechnician()
                .forEach(r -> resolution.put(r.technicianId(), r.avgResolutionMinutes()));
        List<WorkloadReportRow> rows = new ArrayList<>();
        for (User technician : users.findAllTechnicians()) {
            if (!technician.isActive()) {
                continue;
            }
            TechnicianProfile profile = technician.technicianRole().orElseThrow().getProfile();
            Workload w = load.getOrDefault(technician.getId(), Workload.NONE);
            rows.add(new WorkloadReportRow(technician.getId(), technician.getName(), w.activeIncidents(), w.load(),
                    profile.getMaxLoad(), round1(resolution.getOrDefault(technician.getId(), 0.0))));
        }
        rows.sort((a, b) -> Integer.compare(b.load(), a.load()));
        return rows;
    }

    static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
