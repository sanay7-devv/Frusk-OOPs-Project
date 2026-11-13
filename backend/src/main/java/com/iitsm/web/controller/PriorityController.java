package com.iitsm.web.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.priority.PriorityWhatIfService;
import com.iitsm.application.priority.PriorityWhatIfService.WhatIfView;
import com.iitsm.web.dto.report.PriorityWhatIfRequest;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/** Priority what-if (A11, module M10): read-only; nothing is saved or recalculated. */
@RestController
@RequestMapping("/api/v1/priority")
@Tag(name = "Priority")
public class PriorityController {

    private final PriorityWhatIfService whatIf;

    public PriorityController(PriorityWhatIfService whatIf) {
        this.whatIf = whatIf;
    }

    @PostMapping("/what-if")
    @PreAuthorize("hasAuthority('INCIDENT_VIEW_OWN')")
    @Operation(summary = "Which priority and score the engine would give for other impact, urgency and affected users, "
            + "for an existing incident (incidentId) or for raw input (serviceId); changes nothing")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND, ErrorCode.SERVICE_NOT_FOUND, ErrorCode.NOT_FOUND})
    public WhatIfView whatIf(@AuthenticationPrincipal AuthenticatedUser caller,
                             @Valid @RequestBody PriorityWhatIfRequest request) {
        return whatIf.whatIf(caller, request.incidentId(), request.serviceId(), request.categoryId(),
                request.impact(), request.urgency(), request.affectedUsers());
    }
}
