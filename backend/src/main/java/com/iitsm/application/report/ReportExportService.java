package com.iitsm.application.report;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentService;
import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.application.report.ReportViews.LabelCount;
import com.iitsm.application.report.ReportViews.ReportOverview;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.UnauthorizedOperationException;
import com.iitsm.domain.incident.IncidentQuery;
import com.iitsm.domain.repository.PageSlice;
import com.iitsm.domain.user.PermissionKey;

/**
 * CSV export of the reports (GET /reports/export): the same numbers as the report endpoints, written row by row,
 * with a cap on the number of rows (setting report.export.max.rows) and formula injection neutralised by
 * {@link CsvWriter}. The incident list export walks through the list in pages, so memory stays flat.
 */
@Service
public class ReportExportService {

    public static final Set<String> TYPES = Set.of("incidents", "overview", "services", "trends",
            "priority-distribution", "category-distribution", "sla-compliance", "workload");

    private static final int PAGE_SIZE = 200;

    private final ReportService reports;
    private final IncidentService incidents;
    private final ConfigService config;

    public ReportExportService(ReportService reports, IncidentService incidents, ConfigService config) {
        this.reports = reports;
        this.incidents = incidents;
        this.config = config;
    }

    /** Validates the request before anything is written, so an error can still be a normal error response. */
    public String requireType(String type) {
        String normalised = type == null ? "" : type.toLowerCase(Locale.ROOT);
        if (!TYPES.contains(normalised)) {
            throw new InputValidationException("type", "must be one of " + String.join(", ", TYPES.stream().sorted().toList()));
        }
        return normalised;
    }

    public void export(AuthenticatedUser caller, String type, Instant from, Instant to, Appendable out) {
        CsvWriter csv = new CsvWriter(out);
        int maxRows = config.current().intValue(ConfigKey.REPORT_EXPORT_MAX_ROWS);
        switch (type) {
            case "incidents" -> exportIncidents(caller, from, to, csv, maxRows);
            case "overview" -> {
                ReportOverview o = reports.overview(caller, from, to);
                csv.row("metric", "value");
                csv.row("total", o.total());
                csv.row("open", o.open());
                csv.row("critical", o.critical());
                csv.row("resolved", o.resolved());
                csv.row("slaViolations", o.slaViolations());
                csv.row("avgResolutionMinutes", o.avgResolutionMinutes());
                csv.row("avgSatisfaction", o.avgSatisfaction());
            }
            case "services" -> {
                csv.row("serviceId", "service", "count");
                reports.services(caller, from, to).stream().limit(maxRows)
                        .forEach(r -> csv.row(r.serviceId(), r.name(), r.count()));
            }
            case "trends" -> {
                csv.row("date", "created", "resolved");
                reports.trends(caller, from, to, "day").stream().limit(maxRows)
                        .forEach(r -> csv.row(r.date().toString(), r.created(), r.resolved()));
            }
            case "priority-distribution" -> labels(csv, "priority", reports.priorityDistribution(caller, from, to));
            case "category-distribution" -> labels(csv, "category", reports.categoryDistribution(caller, from, to));
            case "sla-compliance" -> {
                csv.row("priority", "total", "met", "violated", "compliancePercent");
                reports.slaCompliance(caller, from, to, "priority").stream().limit(maxRows)
                        .forEach(r -> csv.row(r.label(), r.total(), r.met(), r.violated(), r.compliancePercent()));
            }
            case "workload" -> {
                if (!caller.can(PermissionKey.TEAM_VIEW)) {
                    throw new UnauthorizedOperationException("The workload export needs the TEAM_VIEW permission.");
                }
                csv.row("technicianId", "technician", "active", "load", "maxLoad", "avgResolutionMinutes");
                reports.workload().stream().limit(maxRows).forEach(r -> csv.row(r.technicianId(), r.name(),
                        r.active(), r.load(), r.maxLoad(), r.avgResolutionMinutes()));
            }
            default -> throw new InputValidationException("type", "unknown export type");
        }
    }

    private static void labels(CsvWriter csv, String header, List<LabelCount> rows) {
        csv.row(header, "count");
        rows.forEach(r -> csv.row(r.label(), r.count()));
    }

    private void exportIncidents(AuthenticatedUser caller, Instant from, Instant to, CsvWriter csv, int maxRows) {
        csv.row("code", "title", "status", "priority", "category", "service", "reporter", "assignee", "createdAt",
                "resolutionDue", "slaState", "major");
        int written = 0;
        for (int page = 0; written < maxRows; page++) {
            IncidentQuery query = new IncidentQuery(null, null, null, null, null, null, null, null, null, from, to,
                    page, PAGE_SIZE, "createdAt", true);
            PageSlice<IncidentSummary> slice = incidents.list(caller, query);
            for (IncidentSummary i : slice.items()) {
                if (written++ >= maxRows) {
                    return;
                }
                csv.row(i.code(), i.title(), i.status(), i.priority(), i.category() == null ? null : i.category().name(),
                        i.service().name(), i.reporter().name(), i.assignee() == null ? null : i.assignee().name(),
                        i.createdAt(), i.resolutionDue(), i.slaState(), i.major());
            }
            if ((long) (page + 1) * PAGE_SIZE >= slice.totalItems()) {
                return;
            }
        }
    }
}
