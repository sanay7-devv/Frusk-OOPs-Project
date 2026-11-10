package com.iitsm.web.controller;

import java.time.Instant;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.sla.SlaViolationService;
import com.iitsm.application.sla.SlaViolationService.SlaViolationView;
import com.iitsm.web.dto.PageResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Recorded SLA violations for admins and team leads (contract B.4). */
@RestController
@RequestMapping("/api/v1/sla")
@Tag(name = "SLA")
public class SlaController {

    private final SlaViolationService violations;

    public SlaController(SlaViolationService violations) {
        this.violations = violations;
    }

    @GetMapping("/violations")
    @PreAuthorize("hasAuthority('SLA_VIOLATION_VIEW')")
    @Operation(summary = "SLA violations recorded in [from, to), newest first (admin, team lead)")
    public PageResponse<SlaViolationView> violations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return PageResponse.of(violations.list(from, to, page, size));
    }
}
