package com.iitsm.web.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.graph.ServiceGraphService;
import com.iitsm.application.graph.ServiceGraphViews.ImpactView;
import com.iitsm.application.graph.ServiceGraphViews.ServiceGraphView;
import com.iitsm.application.graph.ServiceGraphViews.StatusBoard;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Service dependency graph, impact analysis and the status board; any logged-in user (contract B.4, C.8, E1). */
@RestController
@RequestMapping("/api/v1/services")
@Tag(name = "Service graph")
public class ServiceGraphController {

    private final ServiceGraphService graph;

    public ServiceGraphController(ServiceGraphService graph) {
        this.graph = graph;
    }

    @GetMapping("/graph")
    @Operation(summary = "Services with open incident counts, and dependency edges (from depends on to)")
    public ServiceGraphView graph() {
        return graph.graph();
    }

    @GetMapping("/{id}/impact")
    @ApiErrors({ErrorCode.SERVICE_NOT_FOUND})
    @Operation(summary = "Services that depend on this one, directly or through others, with distance")
    public ImpactView impact(@PathVariable Long id) {
        return graph.impact(id);
    }

    @GetMapping("/status")
    @Operation(summary = "Service status board (E1): Healthy, Degraded or Outage, based on reported incidents")
    public StatusBoard status() {
        return graph.status();
    }
}
