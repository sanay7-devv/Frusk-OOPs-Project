package com.iitsm.web.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.incident.IncidentViews.IncidentDetail;
import com.iitsm.application.problem.KnownOutageService;
import com.iitsm.application.problem.ProblemService;
import com.iitsm.application.problem.ProblemViews.KnownOutageView;
import com.iitsm.application.problem.ProblemViews.ProblemView;
import com.iitsm.application.problem.ProblemViews.RecurringView;
import com.iitsm.application.problem.ProblemViews.RootCauseView;
import com.iitsm.application.problem.RecurringProblemService;
import com.iitsm.domain.problem.ProblemStatus;
import com.iitsm.web.dto.problem.CreateProblemRequest;
import com.iitsm.web.dto.incident.ResolveRequest;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * Problem records: groups of correlated incidents, Major Incident Mode and the recurring-problem detector (API
 * contract B.4, module M12). Team leads and administrators manage them; every employee may see the known outages of
 * a service and join one.
 */
@RestController
@RequestMapping("/api/v1/problems")
@Tag(name = "Problems")
public class ProblemController {

    private final ProblemService problems;
    private final KnownOutageService outages;
    private final RecurringProblemService recurring;

    public ProblemController(ProblemService problems, KnownOutageService outages, RecurringProblemService recurring) {
        this.problems = problems;
        this.outages = outages;
        this.recurring = recurring;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('TEAM_VIEW')")
    @Operation(summary = "Problem records, newest first, optionally only OPEN or RESOLVED (admin, team lead)")
    public List<ProblemView> list(@RequestParam(required = false) ProblemStatus status) {
        return problems.list(status);
    }

    @GetMapping("/known-outages")
    @PreAuthorize("hasAuthority('INCIDENT_CREATE')")
    @Operation(summary = "Open outages on a service or on a service it depends on, for the report form banner (any user)")
    @ApiErrors({ErrorCode.SERVICE_NOT_FOUND})
    public List<KnownOutageView> knownOutages(@AuthenticationPrincipal AuthenticatedUser caller,
                                              @RequestParam Long serviceId) {
        return problems.knownOutages(caller, serviceId);
    }

    @GetMapping("/recurring")
    @PreAuthorize("hasAuthority('TEAM_VIEW')")
    @Operation(summary = "Recurring-problem proposals: the same service and category fixed again and again, or "
            + "incidents reopened repeatedly (admin, team lead)")
    public List<RecurringView> recurring() {
        return recurring.proposals();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('TEAM_VIEW')")
    @Operation(summary = "Open a problem record from chosen incidents, for example a recurring-problem proposal "
            + "(admin, team lead)")
    @ApiErrors({ErrorCode.VALIDATION_FAILED})
    public ProblemView create(@AuthenticationPrincipal AuthenticatedUser caller,
                              @Valid @RequestBody CreateProblemRequest request) {
        return problems.create(caller, request.title(), request.incidentIds());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('TEAM_VIEW')")
    @Operation(summary = "One problem record with its lead incident and every linked incident")
    @ApiErrors({ErrorCode.NOT_FOUND})
    public ProblemView get(@PathVariable Long id) {
        return problems.get(id);
    }

    @GetMapping("/{id}/root-cause")
    @PreAuthorize("hasAuthority('TEAM_VIEW')")
    @Operation(summary = "Probable root cause from the service dependency graph, with the paths as evidence")
    @ApiErrors({ErrorCode.NOT_FOUND})
    public RootCauseView rootCause(@PathVariable Long id) {
        return problems.rootCause(id);
    }

    @PostMapping("/{id}/join")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('INCIDENT_CREATE')")
    @Operation(summary = "Join a known outage with one click: raises the affected users of the lead incident and "
            + "re-runs its priority; returns the caller's own (duplicate-closed) incident")
    @ApiErrors({ErrorCode.NOT_FOUND, ErrorCode.INVALID_STATE_TRANSITION})
    public IncidentDetail join(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        return outages.join(caller, id);
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAuthority('INCIDENT_VIEW_ALL')")
    @Operation(summary = "Resolve every open incident of the record with one fix (administrator)")
    @ApiErrors({ErrorCode.NOT_FOUND, ErrorCode.INVALID_STATE_TRANSITION, ErrorCode.VALIDATION_FAILED})
    public ProblemView resolve(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                               @Valid @RequestBody ResolveRequest request) {
        return problems.resolve(caller, id, request.rootCause(), request.notes(), request.steps(),
                request.timeSpentMinutes());
    }

    @DeleteMapping("/{id}/incidents/{incidentId}")
    @PreAuthorize("hasAuthority('INCIDENT_VIEW_ALL')")
    @Operation(summary = "Take one incident out of the record (administrator); audited")
    @ApiErrors({ErrorCode.NOT_FOUND})
    public ProblemView ungroup(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                               @PathVariable Long incidentId) {
        return problems.ungroup(caller, id, incidentId);
    }
}
