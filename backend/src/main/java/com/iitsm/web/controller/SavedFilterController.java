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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.search.SavedFilterService;
import com.iitsm.application.search.SavedFilterService.SavedFilterView;
import com.iitsm.web.dto.report.SavedFilterRequest;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/** Saved views (module M10, handbook A.4 saved_filters): every user manages their own. */
@RestController
@RequestMapping("/api/v1/saved-filters")
@Tag(name = "Saved views")
@PreAuthorize("hasAuthority('INCIDENT_VIEW_OWN')")
public class SavedFilterController {

    private final SavedFilterService filters;

    public SavedFilterController(SavedFilterService filters) {
        this.filters = filters;
    }

    @GetMapping
    @Operation(summary = "My saved incident views, by name")
    public List<SavedFilterView> list(@AuthenticationPrincipal AuthenticatedUser caller) {
        return filters.list(caller);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Save the filters of GET /incidents under a name (status, priority, slaState, ...)")
    public SavedFilterView create(@AuthenticationPrincipal AuthenticatedUser caller,
                                  @Valid @RequestBody SavedFilterRequest request) {
        return filters.create(caller, request.name(), request.filter());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete one of my saved views")
    @ApiErrors({ErrorCode.NOT_FOUND})
    public void delete(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        filters.delete(caller, id);
    }
}
