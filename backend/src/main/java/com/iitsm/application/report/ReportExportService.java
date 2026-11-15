package com.iitsm.application.report;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentService;
import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.application.report.ReportPdfRenderer.ReportDocument;
import com.iitsm.application.report.ReportViews.LabelCount;
import com.iitsm.application.report.ReportViews.ReportOverview;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.UnauthorizedOperationException;
import com.iitsm.domain.incident.IncidentQuery;
import com.iitsm.domain.repository.PageSlice;
import com.iitsm.domain.user.PermissionKey;

/**
 * Export of the reports (GET /reports/export) as CSV or PDF: the same numbers as the report endpoints, written row
 * by row into an {@link ExportSink}, with a cap on the number of rows (setting report.export.max.rows). CSV
 * neutralises formula injection through {@link CsvWriter}; the PDF is drawn by a {@link ReportPdfRenderer} (Adapter). The incident list export walks through the list in pages, so memory stays flat.
 */
@Service
public class ReportExportService {

    public static final Set<String> TYPES = Set.of("incidents", "overview", "services", "trends",
            "priority-distribution", "category-distribution", "sla-compliance", "workload");

    private static final int PAGE_SIZE = 200;

    private final ReportService reports;
    private final IncidentService incidents;
    private final ConfigService config;
    private final ReportPdfRenderer pdf;
    private final Clock clock;

    public ReportExportService(ReportService reports, IncidentService incidents, ConfigService config,
                               ReportPdfRenderer pdf, Clock clock) {
        this.reports = reports;
        this.incidents = incidents;
        this.config = config;
        this.pdf = pdf;
        this.clock = clock;
    }

    public static final Set<String> FORMATS = Set.of("csv", "pdf");

    /** Validates the format (csv or pdf, any case) before anything is written. */
    public String requireFormat(String format) {
        String normalised = format == null ? "" : format.toLowerCase(Locale.ROOT);
        if (!FORMATS.contains(normalised)) {
            throw new InputValidationException("format", "must be one of csv, pdf");
        }
        return normalised;
    }

    public void exportCsv(AuthenticatedUser caller, String type, Instant from, Instant to, Appendable out) {
        CsvWriter csv = new CsvWriter(out);
        export(caller, type, from, to, new ExportSink() {
            @Override
            public void header(String... names) {
                csv.row((Object[]) names);
            }

            @Override
            public void row(Object... cells) {
                csv.row(cells);
            }
        });
    }

    /** Collects the same rows the CSV would have and renders them; the table is in memory, bounded by the row cap. */
    public byte[] exportPdf(AuthenticatedUser caller, String type, Instant from, Instant to) {
        List<String> headers = new ArrayList<>();
        List<List<String>> rows = new ArrayList<>();
        export(caller, type, from, to, new ExportSink() {
            @Override
            public void header(String... names) {
                headers.addAll(List.of(names));
            }

            @Override
            public void row(Object... cells) {
                List<String> row = new ArrayList<>(cells.length);
                for (Object c : cells) {
                    row.add(c == null ? "" : c.toString());
                }
                rows.add(row);
            }
        });
        int maxRows = config.current().intValue(ConfigKey.REPORT_EXPORT_MAX_ROWS);
        boolean capped = !"overview".equals(type) && rows.size() >= maxRows;
        return pdf.render(new ReportDocument("I-ITSM report: " + type, from, to, clock.instant(), headers, rows, capped));
    }

    /** Validates the request before anything is written, so an error can still be a normal error response. */
    public String requireType(String type) {
        String normalised = type == null ? "" : type.toLowerCase(Locale.ROOT);
        if (!TYPES.contains(normalised)) {
            throw new InputValidationException("type", "must be one of " + String.join(", ", TYPES.stream().sorted().toList()));
        }
        return normalised;
    }

    private void export(AuthenticatedUser caller, String type, Instant from, Instant to, ExportSink csv) {
        int maxRows = config.current().intValue(ConfigKey.REPORT_EXPORT_MAX_ROWS);
        switch (type) {
            case "incidents" -> exportIncidents(caller, from, to, csv, maxRows);
            case "overview" -> {
                ReportOverview o = reports.overview(caller, from, to);
                csv.header("metric", "value");
                csv.row("total", o.total());
                csv.row("open", o.open());
                csv.row("critical", o.critical());
                csv.row("resolved", o.resolved());
                csv.row("slaViolations", o.slaViolations());
                csv.row("avgResolutionMinutes", o.avgResolutionMinutes());
                csv.row("avgSatisfaction", o.avgSatisfaction());
            }
            case "services" -> {
                csv.header("serviceId", "service", "count");
                reports.services(caller, from, to).stream().limit(maxRows)
                        .forEach(r -> csv.row(r.serviceId(), r.name(), r.count()));
            }
            case "trends" -> {
                csv.header("date", "created", "resolved");
                reports.trends(caller, from, to, "day").stream().limit(maxRows)
                        .forEach(r -> csv.row(r.date().toString(), r.created(), r.resolved()));
            }
            case "priority-distribution" -> labels(csv, "priority", reports.priorityDistribution(caller, from, to));
            case "category-distribution" -> labels(csv, "category", reports.categoryDistribution(caller, from, to));
            case "sla-compliance" -> {
                csv.header("priority", "total", "met", "violated", "compliancePercent");
                reports.slaCompliance(caller, from, to, "priority").stream().limit(maxRows)
                        .forEach(r -> csv.row(r.label(), r.total(), r.met(), r.violated(), r.compliancePercent()));
            }
            case "workload" -> {
                if (!caller.can(PermissionKey.TEAM_VIEW)) {
                    throw new UnauthorizedOperationException("The workload export needs the TEAM_VIEW permission.");
                }
                csv.header("technicianId", "technician", "active", "load", "maxLoad", "avgResolutionMinutes");
                reports.workload().stream().limit(maxRows).forEach(r -> csv.row(r.technicianId(), r.name(),
                        r.active(), r.load(), r.maxLoad(), r.avgResolutionMinutes()));
            }
            default -> throw new InputValidationException("type", "unknown export type");
        }
    }

    private static void labels(ExportSink csv, String header, List<LabelCount> rows) {
        csv.header(header, "count");
        rows.forEach(r -> csv.row(r.label(), r.count()));
    }

    private void exportIncidents(AuthenticatedUser caller, Instant from, Instant to, ExportSink csv, int maxRows) {
        csv.header("code", "title", "status", "priority", "category", "service", "reporter", "assignee", "createdAt",
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
