package com.iitsm.web.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.admin.UserAdminService;
import com.iitsm.application.admin.UserAdminViews.TechnicianView;
import com.iitsm.application.assignment.TechnicianWorkService;
import com.iitsm.application.assignment.TechnicianWorkService.WorkloadView;
import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.incident.IncidentService;
import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.domain.incident.IncidentQuery;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.user.Availability;
import com.iitsm.web.dto.PageResponse;
import com.iitsm.web.dto.admin.AvailabilityRequest;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Technician lists for leads and admins, and a technician's own workload and queue (contract B.4). */
@RestController
@RequestMapping("/api/v1/technicians")
@Tag(name = "Technicians")
public class TechnicianController {

    private final UserAdminService admin;
    private final TechnicianWorkService work;
    private final IncidentService incidents;

    public TechnicianController(UserAdminService admin, TechnicianWorkService work, IncidentService incidents) {
        this.admin = admin;
        this.work = work;
        this.incidents = incidents;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('TEAM_VIEW')")
    @Operation(summary = "Active technicians with load, availability and skills (team lead, admin)")
    public List<TechnicianView> technicians(@RequestParam(required = false) Long skillId,
                                            @RequestParam(required = false) Availability availability) {
        return admin.technicians(skillId, availability);
    }

    @GetMapping("/me/workload")
    @PreAuthorize("hasAuthority('WORKLOAD_VIEW')")
    @Operation(summary = "My load, capacity, resolved this week and next SLA deadlines")
    @ApiErrors({ErrorCode.USER_NOT_FOUND})
    public WorkloadView myWorkload(@AuthenticationPrincipal AuthenticatedUser caller) {
        return work.workload(caller.id());
    }

    @GetMapping("/me/queue")
    @PreAuthorize("hasAuthority('WORKLOAD_VIEW')")
    @Operation(summary = "My active incidents, most urgent SLA first")
    public PageResponse<IncidentSummary> myQueue(@AuthenticationPrincipal AuthenticatedUser caller,
                                                 @RequestParam(defaultValue = "0") @Min(0) int page,
                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        IncidentQuery query = new IncidentQuery(null, List.copyOf(IncidentStatus.ACTIVE_WORK), null, null, null,
                caller.id(), null, null, null, null, null, page, size, "resolutionDue", true);
        return PageResponse.of(incidents.list(caller, query));
    }

    @PutMapping("/me/availability")
    @PreAuthorize("hasAuthority('INCIDENT_HANDLE')")
    @Operation(summary = "Set my availability (AWAY and OFF_DUTY stop new assignments)")
    public TechnicianView myAvailability(@AuthenticationPrincipal AuthenticatedUser caller,
                                         @Valid @RequestBody AvailabilityRequest request) {
        return admin.changeOwnAvailability(caller.id(), request.availability());
    }
}
