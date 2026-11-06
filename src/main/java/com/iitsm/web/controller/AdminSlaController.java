package com.iitsm.web.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.catalog.CatalogViews.EscalationPolicyView;
import com.iitsm.application.catalog.CatalogViews.SlaPolicyView;
import com.iitsm.application.catalog.SlaAdminService;
import com.iitsm.web.dto.catalog.EscalationPolicyRequest;
import com.iitsm.web.dto.catalog.SlaPolicyRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/** Admin management of SLA and escalation policies (contract B.4). Needs the SLA_MANAGE permission. */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAuthority('SLA_MANAGE')")
@Tag(name = "Admin: SLA and escalation")
public class AdminSlaController {

    private final SlaAdminService sla;

    public AdminSlaController(SlaAdminService sla) {
        this.sla = sla;
    }

    @GetMapping("/sla-policies")
    @Operation(summary = "All SLA policies: global defaults first, then per service")
    public List<SlaPolicyView> slaPolicies() {
        return sla.allSlaPolicies();
    }

    @PostMapping("/sla-policies")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add an SLA policy (serviceId null = global default; one per service and priority)")
    public SlaPolicyView createSlaPolicy(@Valid @RequestBody SlaPolicyRequest request) {
        return sla.createSlaPolicy(request.serviceId(), request.priority(), request.responseMinutes(),
                request.resolutionMinutes(), request.calendarType());
    }

    @PutMapping("/sla-policies/{id}")
    @Operation(summary = "Change the response and resolution targets")
    public SlaPolicyView updateSlaPolicy(@PathVariable Long id, @Valid @RequestBody SlaPolicyRequest request) {
        return sla.updateSlaPolicy(id, request.serviceId(), request.priority(), request.responseMinutes(),
                request.resolutionMinutes(), request.calendarType());
    }

    @DeleteMapping("/sla-policies/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSlaPolicy(@PathVariable Long id) {
        sla.deleteSlaPolicy(id);
    }

    @GetMapping("/escalation-policies")
    public List<EscalationPolicyView> escalationPolicies() {
        return sla.allEscalationPolicies();
    }

    @PostMapping("/escalation-policies")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add an escalation level (P1 or P2, levels added in order without gaps)")
    public EscalationPolicyView createEscalationPolicy(@Valid @RequestBody EscalationPolicyRequest request) {
        return sla.createEscalationPolicy(request.priority(), request.level(), request.timeoutMinutes());
    }

    @PutMapping("/escalation-policies/{id}")
    @Operation(summary = "Change the timeout of an escalation level")
    public EscalationPolicyView updateEscalationPolicy(@PathVariable Long id,
                                                       @Valid @RequestBody EscalationPolicyRequest request) {
        return sla.updateEscalationPolicy(id, request.priority(), request.level(), request.timeoutMinutes());
    }

    @DeleteMapping("/escalation-policies/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove the highest escalation level of a priority")
    public void deleteEscalationPolicy(@PathVariable Long id) {
        sla.deleteEscalationPolicy(id);
    }
}
