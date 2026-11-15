package com.iitsm.web.controller;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.assignment.AssignmentService.RecommendationView;
import com.iitsm.application.audit.AuditService.AuditEntryView;
import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.escalation.EscalationService;
import com.iitsm.application.incident.IncidentCreationService;
import com.iitsm.application.incident.IncidentService;
import com.iitsm.application.incident.IncidentViews.CommentView;
import com.iitsm.application.incident.IncidentViews.IncidentDetail;
import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.incident.IncidentQuery;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.incident.SlaState;
import com.iitsm.domain.priority.Priority;
import com.iitsm.web.dto.PageResponse;
import com.iitsm.web.dto.incident.AssignRequest;
import com.iitsm.web.dto.incident.CommentRequest;
import com.iitsm.web.dto.incident.CreateIncidentRequest;
import com.iitsm.web.dto.incident.MarkDuplicateRequest;
import com.iitsm.web.dto.incident.OverridePriorityRequest;
import com.iitsm.web.dto.incident.ProvideInfoRequest;
import com.iitsm.web.dto.incident.ReasonRequest;
import com.iitsm.web.dto.incident.ReassignRequest;
import com.iitsm.web.dto.incident.RequestInfoRequest;
import com.iitsm.web.dto.incident.ResolveRequest;
import com.iitsm.web.dto.incident.UpdateIncidentRequest;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Incident endpoints (API contract B.4). Thin on purpose: who may act and which moves are legal is decided in
 * IncidentService, IncidentAccessPolicy and the State pattern. Every action returns the updated IncidentDetail,
 * including the caller's allowedActions.
 */
@RestController
@RequestMapping("/api/v1/incidents")
@Tag(name = "Incidents")
public class IncidentController {

    private static final Set<String> SORT_FIELDS = Set.of("createdAt", "priority", "status", "code", "resolutionDue");

    private final IncidentService incidents;
    private final IncidentCreationService creation;
    private final EscalationService escalation;

    public IncidentController(IncidentService incidents, IncidentCreationService creation,
                              EscalationService escalation) {
        this.incidents = incidents;
        this.creation = creation;
        this.escalation = escalation;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Report an incident: classified, prioritized and given SLA deadlines on creation")
    @ApiErrors({ErrorCode.SERVICE_NOT_FOUND, ErrorCode.SLA_NOT_CONFIGURED, ErrorCode.DUPLICATE_INCIDENT})
    public IncidentDetail create(@AuthenticationPrincipal AuthenticatedUser caller,
                                 @Valid @RequestBody CreateIncidentRequest request) {
        return creation.create(caller, request.title(), request.description(), request.serviceId(),
                request.categoryId(), request.impact(), request.urgency(), request.affectedUsers(),
                Boolean.TRUE.equals(request.confirmNotDuplicate()));
    }

    @GetMapping
    @Operation(summary = "Incidents the caller may see, filtered, paged and sorted (sort=field,asc|desc)")
    public PageResponse<IncidentSummary> list(
            @AuthenticationPrincipal AuthenticatedUser caller,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) List<IncidentStatus> status,
            @RequestParam(required = false) List<Priority> priority,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long serviceId,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long reporterId,
            @RequestParam(required = false) SlaState slaState,
            @RequestParam(required = false) @Min(0) @Max(3) Integer minEscalationLevel,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdTo,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "false") boolean assignedToMe,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        String[] sortParts = sort.split(",");
        String sortField = sortParts[0].strip();
        if (!SORT_FIELDS.contains(sortField)) {
            throw new InputValidationException("sort", "must be one of " + String.join(", ", SORT_FIELDS));
        }
        boolean ascending = sortParts.length > 1 && sortParts[1].strip().equalsIgnoreCase("asc");
        IncidentQuery query = new IncidentQuery(null, status, priority, categoryId, serviceId,
                assignedToMe ? caller.id() : assigneeId, mine ? caller.id() : reporterId, code, q, createdFrom,
                createdTo, page, size, sortField, ascending, slaState, minEscalationLevel);
        return PageResponse.of(incidents.list(caller, query));
    }

    @GetMapping("/{id}")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND})
    public IncidentDetail detail(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return incidents.detail(caller, id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Edit description, impact, urgency or affected users (until resolved); priority is recalculated")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT,
            ErrorCode.SLA_NOT_CONFIGURED})
    public IncidentDetail update(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                 @Valid @RequestBody UpdateIncidentRequest request) {
        return incidents.update(caller, id, request.description(), request.impact(), request.urgency(),
                request.affectedUsers(), request.version());
    }

    @GetMapping("/{id}/recommendations")
    @Operation(summary = "Top 3 technicians with reasons and factor scores, plus who is excluded and why")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND, ErrorCode.UNAUTHORIZED_OPERATION})
    public RecommendationView recommendations(@AuthenticationPrincipal AuthenticatedUser caller,
                                              @PathVariable Long id) {
        return incidents.recommendations(caller, id);
    }

    @PostMapping("/{id}/assign")
    @Operation(summary = "Assign to a technician, or omit technicianId to use the active strategy (admin, team lead)")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.CONFLICT_OF_INTEREST,
            ErrorCode.USER_NOT_FOUND,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.TECHNICIAN_UNAVAILABLE,
            ErrorCode.WORKLOAD_EXCEEDED,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail assign(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                 @RequestBody AssignRequest request) {
        return incidents.assign(caller, id, request.technicianId());
    }

    @PostMapping("/{id}/reassign")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.CONFLICT_OF_INTEREST,
            ErrorCode.USER_NOT_FOUND,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.TECHNICIAN_UNAVAILABLE,
            ErrorCode.WORKLOAD_EXCEEDED,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail reassign(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                   @Valid @RequestBody ReassignRequest request) {
        return incidents.reassign(caller, id, request.technicianId(), request.reason());
    }

    @PostMapping("/{id}/escalate")
    @Operation(summary = "Raise the escalation level by one (assignee, team lead, admin); the status does not change")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.VALIDATION_FAILED,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail escalate(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                   @Valid @RequestBody ReasonRequest request) {
        return escalation.escalate(caller, id, request.reason());
    }

    @PostMapping("/{id}/acknowledge")
    @Operation(summary = "Acknowledge (assigned technician); stops the response clock")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail acknowledge(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return incidents.acknowledge(caller, id);
    }

    @PostMapping("/{id}/start")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail start(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return incidents.startWork(caller, id);
    }

    @PostMapping("/{id}/request-info")
    @Operation(summary = "Ask the reporter for information; pauses the SLA clock")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail requestInfo(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                      @Valid @RequestBody RequestInfoRequest request) {
        return incidents.requestInfo(caller, id, request.message());
    }

    @PostMapping("/{id}/provide-info")
    @Operation(summary = "Answer the technician (reporter); resumes the SLA clock")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail provideInfo(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                      @Valid @RequestBody ProvideInfoRequest request) {
        return incidents.provideInfo(caller, id, request.message());
    }

    @PostMapping("/{id}/resolve")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail resolve(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                  @Valid @RequestBody ResolveRequest request) {
        return incidents.resolve(caller, id, request.rootCause(), request.notes(), request.steps(),
                request.timeSpentMinutes(), Boolean.TRUE.equals(request.reusableSolution()));
    }

    @PostMapping("/{id}/verify")
    @Operation(summary = "Confirm the fix (reporter)")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail verify(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return incidents.verify(caller, id);
    }

    @PostMapping("/{id}/close")
    @Operation(summary = "Close a verified incident (admin)")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail close(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return incidents.close(caller, id);
    }

    @PostMapping("/{id}/reopen")
    @Operation(summary = "Reopen (reporter or admin; from CLOSED only within the reopen window)")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT,
            ErrorCode.SLA_NOT_CONFIGURED})
    public IncidentDetail reopen(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                 @Valid @RequestBody ReasonRequest request) {
        return incidents.reopen(caller, id, request.reason());
    }

    @PostMapping("/{id}/withdraw")
    @Operation(summary = "Withdraw the report before work starts (reporter; CLASSIFIED, ASSIGNED or ACKNOWLEDGED); "
            + "closes as WITHDRAWN")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.VALIDATION_FAILED,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail withdraw(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                   @Valid @RequestBody ReasonRequest request) {
        return incidents.withdraw(caller, id, request.reason());
    }

    @PostMapping("/{id}/mark-duplicate")
    @Operation(summary = "Close as a duplicate of another incident (admin, team lead); audited as DUPLICATE_LINKED")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.VALIDATION_FAILED,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT})
    public IncidentDetail markDuplicate(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                        @Valid @RequestBody MarkDuplicateRequest request) {
        return incidents.markDuplicate(caller, id, request.duplicateOfId());
    }

    @PostMapping("/{id}/override-priority")
    @Operation(summary = "Set the priority by hand with a reason (admin or team lead)")
    @ApiErrors({
            ErrorCode.INCIDENT_NOT_FOUND,
            ErrorCode.UNAUTHORIZED_OPERATION,
            ErrorCode.INVALID_STATE_TRANSITION,
            ErrorCode.OPTIMISTIC_LOCK_CONFLICT,
            ErrorCode.SLA_NOT_CONFIGURED})
    public IncidentDetail overridePriority(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                           @Valid @RequestBody OverridePriorityRequest request) {
        return incidents.overridePriority(caller, id, request.priority(), request.reason());
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Audit trail of the incident, oldest first (internal notes are hidden from the reporter)")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND})
    public List<AuditEntryView> history(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return incidents.history(caller, id);
    }

    @GetMapping("/{id}/comments")
    @Operation(summary = "Comments (internal notes are hidden from the reporter)")
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND})
    public List<CommentView> comments(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return incidents.comments(caller, id);
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @ApiErrors({ErrorCode.INCIDENT_NOT_FOUND, ErrorCode.UNAUTHORIZED_OPERATION})
    public CommentView addComment(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                  @Valid @RequestBody CommentRequest request) {
        return incidents.addComment(caller, id, request.body(), request.visibility());
    }
}
