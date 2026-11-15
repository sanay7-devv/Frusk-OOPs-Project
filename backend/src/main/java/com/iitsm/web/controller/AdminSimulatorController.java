package com.iitsm.web.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.simulation.SimulatorService;
import com.iitsm.application.simulation.SimulatorService.SimulationView;
import com.iitsm.web.dto.simulation.ConfigurationRequest;
import com.iitsm.web.dto.simulation.SimulationRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * The Service Desk Simulator (S1): replays recent incidents under up to three configurations and compares them,
 * then lets the administrator apply the winner. Needs CONFIG_MANAGE, like the settings it changes.
 */
@RestController
@RequestMapping("/api/v1/admin/simulations")
@PreAuthorize("hasAuthority('CONFIG_MANAGE')")
@Tag(name = "Admin: service desk simulator")
public class AdminSimulatorController {

    private final SimulatorService simulator;

    public AdminSimulatorController(SimulatorService simulator) {
        this.simulator = simulator;
    }

    @PostMapping
    @Operation(summary = "Replay recent incidents in memory under up to three configurations and compare the results. "
            + "Writes nothing: no incidents, audit entries or notifications are created")
    public SimulationView simulate(@RequestBody @Valid SimulationRequest request) {
        List<SimulatorService.ConfigurationSpec> specs = request.configurations() == null ? null
                : request.configurations().stream().map(ConfigurationRequest::toSpec).collect(Collectors.toList());
        return simulator.simulate(request.lastIncidents(), request.speedUp(), specs);
    }

    @PostMapping("/apply")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Apply a configuration's strategy and weights to the live settings (audited as CONFIG_CHANGED)")
    public void apply(@AuthenticationPrincipal AuthenticatedUser caller,
                      @RequestBody @Valid ConfigurationRequest request) {
        simulator.apply(caller.id(), request.toSpec());
    }
}
