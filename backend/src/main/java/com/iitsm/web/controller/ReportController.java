package com.iitsm.web.controller;

import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.report.CoverageRiskService;
import com.iitsm.application.report.ReportExportService;
import com.iitsm.application.report.ReportService;
import com.iitsm.application.report.ReportViews.CoverageRiskReport;
import com.iitsm.application.report.ReportViews.LabelCount;
import com.iitsm.application.report.ReportViews.ReportOverview;
import com.iitsm.application.report.ReportViews.ServiceReportRow;
import com.iitsm.application.report.ReportViews.SlaComplianceRow;
import com.iitsm.application.report.ReportViews.TrendPoint;
import com.iitsm.application.report.ReportViews.WorkloadReportRow;

import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Reports (API contract B.4, C.8, module M10). Every report covers the incidents the caller may see, the same rule
 * as the incident list: employees count their own, technicians their own and assigned ones, team leads and
 * administrators all of them. Workload and coverage risk show other people's work and need TEAM_VIEW.
 */
@RestController
@RequestMapping("/api/v1/reports")
@Tag(name = "Reports")
public class ReportController {

    private static final String SEE_INCIDENTS = "hasAuthority('INCIDENT_VIEW_OWN')";

    private final ReportService reports;
    private final ReportExportService export;
    private final CoverageRiskService coverage;

    public ReportController(ReportService reports, ReportExportService export, CoverageRiskService coverage) {
        this.reports = reports;
        this.export = export;
        this.coverage = coverage;
    }

    @GetMapping("/overview")
    @PreAuthorize(SEE_INCIDENTS)
    @Operation(summary = "Totals: open, critical, resolved, SLA violations, averages (incidents created in the range)")
    public ReportOverview overview(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return reports.overview(caller, from, to);
    }

    @GetMapping("/workload")
    @PreAuthorize("hasAuthority('TEAM_VIEW')")
    @Operation(summary = "Current load, capacity and average resolution time of every active technician (staff)")
    public List<WorkloadReportRow> workload() {
        return reports.workload();
    }

    @GetMapping("/services")
    @PreAuthorize(SEE_INCIDENTS)
    @Operation(summary = "Incidents per service, most first")
    public List<ServiceReportRow> services(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return reports.services(caller, from, to);
    }

    @GetMapping("/trends")
    @PreAuthorize(SEE_INCIDENTS)
    @Operation(summary = "Incidents created and resolved per day or week (UTC; default the last 30 days or 12 weeks)")
    public List<TrendPoint> trends(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String bucket) {
        return reports.trends(caller, from, to, bucket);
    }

    @GetMapping("/priority-distribution")
    @PreAuthorize(SEE_INCIDENTS)
    @Operation(summary = "Incidents per priority (P1 to P4 always listed)")
    public List<LabelCount> priorityDistribution(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return reports.priorityDistribution(caller, from, to);
    }

    @GetMapping("/category-distribution")
    @PreAuthorize(SEE_INCIDENTS)
    @Operation(summary = "Incidents per category (Uncategorized for those still in triage)")
    public List<LabelCount> categoryDistribution(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return reports.categoryDistribution(caller, from, to);
    }

    @GetMapping("/sla-compliance")
    @PreAuthorize(SEE_INCIDENTS)
    @Operation(summary = "SLA met and violated, grouped by priority (default), service or technician")
    public List<SlaComplianceRow> slaCompliance(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String groupBy) {
        return reports.slaCompliance(caller, from, to, groupBy);
    }

    @GetMapping("/coverage-risk")
    @PreAuthorize("hasAuthority('TEAM_VIEW')")
    @Operation(summary = "Coverage risk (E3): critical services whose categories one or no available technician can take")
    public CoverageRiskReport coverageRisk(@RequestParam(defaultValue = "false") boolean onlyFlagged) {
        return coverage.report(onlyFlagged);
    }

    @GetMapping("/export")
    @PreAuthorize(SEE_INCIDENTS)
    @ApiErrors({ErrorCode.VALIDATION_FAILED, ErrorCode.UNAUTHORIZED_OPERATION})
    @Operation(summary = "Download a report as CSV (default) or PDF (format=csv|pdf; type: incidents, overview, services, "
            + "trends, priority-distribution, category-distribution, sla-compliance, workload); CSV formula cells are "
            + "neutralised and rows are capped; the PDF has a title, the date range, the generated-at time and the same rows",
            responses = @ApiResponse(responseCode = "200", description = "CSV or PDF file",
                    content = {
                        @Content(mediaType = "text/csv", schema = @Schema(type = "string", format = "binary")),
                        @Content(mediaType = "application/pdf", schema = @Schema(type = "string", format = "binary"))}))
    public void export(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestParam String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @Parameter(description = "csv (default) or pdf", schema = @Schema(allowableValues = {"csv", "pdf"}))
            @RequestParam(defaultValue = "csv") String format,
            HttpServletResponse response) throws IOException {
        String checked = export.requireType(type);
        String checkedFormat = export.requireFormat(format);
        if ("pdf".equals(checkedFormat)) {
            byte[] document = export.exportPdf(caller, checked, from, to);
            response.setContentType("application/pdf");
            response.setContentLength(document.length);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + checked + ".pdf\"");
            response.getOutputStream().write(document);
            return;
        }
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + checked + ".csv\"");
        PrintWriter writer = new PrintWriter(response.getOutputStream(), false, StandardCharsets.UTF_8);
        export.exportCsv(caller, checked, from, to, writer);
        writer.flush();
    }
}
