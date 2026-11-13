package com.iitsm.web.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.intelligence.IntelligenceService;
import com.iitsm.application.intelligence.IntelligenceViews.CategorySuggestionView;
import com.iitsm.application.intelligence.IntelligenceViews.IntakeSuggestionView;
import com.iitsm.application.intelligence.IntelligenceViews.SimilarIncidentView;
import com.iitsm.application.intelligence.IntelligenceViews.SlaRiskView;
import com.iitsm.application.intelligence.IntelligenceViews.SuggestedResolutionView;
import com.iitsm.application.intelligence.IntelligenceViews.ThreadSummaryView;
import com.iitsm.application.intelligence.SlaRiskService;
import com.iitsm.web.dto.intelligence.SimilarRequest;
import com.iitsm.web.dto.intelligence.SuggestCategoryRequest;
import com.iitsm.web.dto.intelligence.SuggestIntakeRequest;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * Intelligence endpoints (API contract B.4, C.6, module M12). Thin on purpose: engines, thresholds, caching, rate
 * limits and visibility live in {@link IntelligenceService} and {@link SlaRiskService}. Every answer carries its
 * {@code source} (LLM or KEYWORD) where an engine produced it.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Intelligence")
public class IntelligenceController {

    private static final String PARTICIPANT = "hasAnyAuthority('INCIDENT_VIEW_OWN','INCIDENT_VIEW_ASSIGNED',"
            + "'INCIDENT_VIEW_TEAM','INCIDENT_VIEW_ALL')";
    private static final String STAFF = "hasAnyAuthority('INCIDENT_HANDLE','INCIDENT_VIEW_TEAM','INCIDENT_VIEW_ALL')";

    private final IntelligenceService intelligence;
    private final SlaRiskService risk;

    public IntelligenceController(IntelligenceService intelligence, SlaRiskService risk) {
        this.intelligence = intelligence;
        this.risk = risk;
    }

    @PostMapping("/intelligence/suggest-category")
    @PreAuthorize("hasAuthority('INCIDENT_CREATE')")
    @Operation(summary = "Category suggestion (LLM with keyword fallback); null category below autocat.min.confidence")
    @ApiErrors({ErrorCode.SERVICE_NOT_FOUND, ErrorCode.RATE_LIMITED})
    public CategorySuggestionView suggestCategory(@AuthenticationPrincipal AuthenticatedUser caller,
                                                  @Valid @RequestBody SuggestCategoryRequest request) {
        return intelligence.suggestCategory(caller, request.title(), request.description(), request.serviceId());
    }

    @PostMapping("/intelligence/suggest-intake")
    @PreAuthorize("hasAuthority('INCIDENT_CREATE')")
    @Operation(summary = "Category, impact and urgency suggested from a free-text description")
    @ApiErrors({ErrorCode.RATE_LIMITED})
    public IntakeSuggestionView suggestIntake(@AuthenticationPrincipal AuthenticatedUser caller,
                                              @Valid @RequestBody SuggestIntakeRequest request) {
        return intelligence.suggestIntake(caller, request.description());
    }

    @PostMapping("/intelligence/similar")
    @PreAuthorize("hasAuthority('INCIDENT_CREATE')")
    @Operation(summary = "Similar open incidents on the same service inside the look-back window (TF-IDF)")
    @ApiErrors({ErrorCode.SERVICE_NOT_FOUND, ErrorCode.RATE_LIMITED})
    public List<SimilarIncidentView> similarToDraft(@AuthenticationPrincipal AuthenticatedUser caller,
                                                    @Valid @RequestBody SimilarRequest request) {
        return intelligence.similarToDraft(caller, request.serviceId(), request.title(), request.description());
    }

    @GetMapping("/incidents/{id}/similar")
    @PreAuthorize(PARTICIPANT)
    @Operation(summary = "Similar open incidents for an existing incident")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND})
    public List<SimilarIncidentView> similar(@AuthenticationPrincipal AuthenticatedUser caller,
                                             @PathVariable Long id) {
        return intelligence.similarToIncident(caller, id);
    }

    @GetMapping("/incidents/{id}/suggested-resolutions")
    @PreAuthorize(STAFF)
    @Operation(summary = "Fixes used on similar resolved incidents, reusable ones preferred (assignee, team lead, admin)")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND, ErrorCode.UNAUTHORIZED_OPERATION})
    public List<SuggestedResolutionView> suggestedResolutions(@AuthenticationPrincipal AuthenticatedUser caller,
                                                              @PathVariable Long id) {
        return intelligence.suggestedResolutions(caller, id);
    }

    @PostMapping("/incidents/{id}/summary")
    @PreAuthorize(STAFF)
    @Operation(summary = "Summary and handover notes of the comments and audit entries (assignee, team lead, admin)")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND, ErrorCode.UNAUTHORIZED_OPERATION, ErrorCode.RATE_LIMITED})
    public ThreadSummaryView summary(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return intelligence.summary(caller, id);
    }

    @GetMapping("/incidents/{id}/sla-risk")
    @PreAuthorize(STAFF)
    @Operation(summary = "SLA risk score 0 to 1 with the contribution of each factor (assignee, team lead, admin)")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND, ErrorCode.UNAUTHORIZED_OPERATION})
    public SlaRiskView slaRisk(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return risk.risk(caller, id);
    }
}
