package com.iitsm.web.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.feedback.FeedbackService;
import com.iitsm.application.feedback.FeedbackView;
import com.iitsm.web.dto.report.FeedbackRequest;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/** Feedback after resolution (contract B.4, module M10): the reporter rates the work, once. */
@RestController
@RequestMapping("/api/v1/incidents/{id}/feedback")
@Tag(name = "Incidents")
public class FeedbackController {

    private final FeedbackService feedback;

    public FeedbackController(FeedbackService feedback) {
        this.feedback = feedback;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('INCIDENT_VIEW_OWN')")
    @Operation(summary = "Rate the resolution, 1 to 5 with an optional comment (reporter, once, from RESOLVED on)")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND, ErrorCode.INVALID_STATE_TRANSITION})
    public FeedbackView give(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                             @Valid @RequestBody FeedbackRequest request) {
        return feedback.give(caller, id, request.rating(), request.comment());
    }
}
