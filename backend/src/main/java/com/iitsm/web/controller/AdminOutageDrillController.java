package com.iitsm.web.controller;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.demo.OutageDrillService;
import com.iitsm.application.demo.OutageDrillService.DrillResult;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * The outage drill (D2, DEC-45), demo profile only like the demo clock: in every other profile the path is a 404.
 * Needs CONFIG_MANAGE (administrators).
 */
@RestController
@Profile("demo")
@RequestMapping("/api/v1/admin/demo")
@PreAuthorize("hasAuthority('CONFIG_MANAGE')")
@Tag(name = "Admin: demo clock")
public class AdminOutageDrillController {

    public record DrillRequest(@NotNull Long rootServiceId) {
    }

    private final OutageDrillService drill;

    public AdminOutageDrillController(OutageDrillService drill) {
        this.drill = drill;
    }

    @PostMapping("/outage-drill")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "File a prepared set of related incidents: two on the failing service and one on each "
            + "service that depends on it, so Major Incident Mode starts in one click")
    @ApiErrors({ErrorCode.SERVICE_NOT_FOUND, ErrorCode.VALIDATION_FAILED})
    public DrillResult outageDrill(@Valid @RequestBody DrillRequest request) {
        return drill.run(request.rootServiceId());
    }
}
