package com.iitsm.web.controller;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.report.PostIncidentReportService;
import com.iitsm.application.report.ReportViews.PostIncidentReport;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Post-incident report (E4, module M10): timeline, time in each status, SLA outcome, people; also as PDF. */
@RestController
@RequestMapping("/api/v1/incidents/{id}/post-incident-report")
@Tag(name = "Reports")
public class PostIncidentReportController {

    private final PostIncidentReportService reports;

    public PostIncidentReportController(PostIncidentReportService reports) {
        this.reports = reports;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('INCIDENT_VIEW_OWN')")
    @Operation(summary = "Post-incident report of one incident, computed from its audit trail (whoever may see it)")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND})
    public PostIncidentReport report(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return reports.report(caller, id);
    }

    @GetMapping("/pdf")
    @PreAuthorize("hasAuthority('INCIDENT_VIEW_OWN')")
    @Operation(summary = "The same report as a PDF file",
            responses = @ApiResponse(responseCode = "200", description = "PDF document",
                    content = @Content(mediaType = "application/pdf",
                            schema = @Schema(type = "string", format = "binary"))))
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND})
    public ResponseEntity<byte[]> pdf(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        byte[] document = reports.pdf(caller, id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("post-incident-report-" + id + ".pdf").build().toString())
                .body(document);
    }
}
