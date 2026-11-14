package com.iitsm.web.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.dashboard.DashboardService;
import com.iitsm.application.dashboard.DashboardViews.LiveDashboard;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** The first load of the live administrator dashboard (contract B.4, C.8); later changes arrive on /topic/dashboard. */
@RestController
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Dashboard")
public class DashboardController {

    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping("/live")
    @PreAuthorize("hasAuthority('REPORT_VIEW')")
    @Operation(summary = "Live dashboard snapshot: counters, open incidents by priority, last 20 events, at-risk incidents")
    public LiveDashboard live() {
        return dashboard.live();
    }
}
