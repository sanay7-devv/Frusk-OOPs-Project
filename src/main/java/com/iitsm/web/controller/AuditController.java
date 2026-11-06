package com.iitsm.web.controller;

import java.time.Instant;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.audit.AuditService;
import com.iitsm.application.audit.AuditService.AuditEntryView;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.audit.AuditQuery;
import com.iitsm.web.dto.PageResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** The audit log for administrators (contract B.4). The trail is append-only: there is no write endpoint. */
@RestController
@RequestMapping("/api/v1/audit")
@Tag(name = "Audit")
public class AuditController {

    private final AuditService audit;

    public AuditController(AuditService audit) {
        this.audit = audit;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    @Operation(summary = "Search the audit log, newest first (admin)")
    public PageResponse<AuditEntryView> search(
            @RequestParam(required = false) Long incidentId,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return PageResponse.of(audit.search(new AuditQuery(incidentId, actorId, action, from, to, page, size)));
    }
}
