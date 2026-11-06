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

import com.iitsm.application.catalog.CatalogService;
import com.iitsm.application.catalog.CatalogViews.CategoryView;
import com.iitsm.application.catalog.CatalogViews.ServiceView;
import com.iitsm.application.catalog.CatalogViews.SkillView;
import com.iitsm.web.dto.catalog.CategoryRequest;
import com.iitsm.web.dto.catalog.DependenciesRequest;
import com.iitsm.web.dto.catalog.ServiceRequest;
import com.iitsm.web.dto.catalog.SkillRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * Admin management of services, categories and skills (contract B.4). Every endpoint needs the CATALOG_MANAGE
 * permission; anyone else gets 403 UNAUTHORIZED_OPERATION. DELETE switches services and categories off (they stay
 * referenced by incidents) and removes skills that are no longer used.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAuthority('CATALOG_MANAGE')")
@Tag(name = "Admin: catalog")
public class AdminCatalogController {

    private final CatalogService catalog;

    public AdminCatalogController(CatalogService catalog) {
        this.catalog = catalog;
    }

    // ------------------------------------------------------------------ services

    @GetMapping("/services")
    @Operation(summary = "All services, active and inactive")
    public List<ServiceView> services() {
        return catalog.allServices();
    }

    @GetMapping("/services/{id}")
    public ServiceView service(@PathVariable Long id) {
        return catalog.service(id);
    }

    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceView createService(@Valid @RequestBody ServiceRequest request) {
        return catalog.createService(request.name(), request.owner(), request.criticality(), request.alwaysP1(),
                request.description(), request.dependencyIds());
    }

    @PutMapping("/services/{id}")
    @Operation(summary = "Update a service (dependencyIds omitted = dependencies unchanged)")
    public ServiceView updateService(@PathVariable Long id, @Valid @RequestBody ServiceRequest request) {
        return catalog.updateService(id, request.name(), request.owner(), request.criticality(),
                request.alwaysP1(), request.description(), request.active() == null || request.active(),
                request.dependencyIds());
    }

    @PutMapping("/services/{id}/dependencies")
    @Operation(summary = "Replace the services this one depends on (no self-reference, no cycles)")
    public ServiceView replaceDependencies(@PathVariable Long id, @Valid @RequestBody DependenciesRequest request) {
        return catalog.replaceDependencies(id, request.dependencyIds());
    }

    @DeleteMapping("/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Switch a service off")
    public void deactivateService(@PathVariable Long id) {
        catalog.deactivateService(id);
    }

    // ------------------------------------------------------------------ categories

    @GetMapping("/categories")
    @Operation(summary = "All categories, flat, with parent and required skills")
    public List<CategoryView> categories() {
        return catalog.allCategories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryView createCategory(@Valid @RequestBody CategoryRequest request) {
        return catalog.createCategory(request.name(), request.parentId(), request.requiredSkillIds());
    }

    @PutMapping("/categories/{id}")
    public CategoryView updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return catalog.updateCategory(id, request.name(), request.parentId(),
                request.active() == null || request.active(), request.requiredSkillIds());
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Switch a category off")
    public void deactivateCategory(@PathVariable Long id) {
        catalog.deactivateCategory(id);
    }

    // ------------------------------------------------------------------ skills

    @GetMapping("/skills")
    public List<SkillView> skills() {
        return catalog.allSkills();
    }

    @PostMapping("/skills")
    @ResponseStatus(HttpStatus.CREATED)
    public SkillView createSkill(@Valid @RequestBody SkillRequest request) {
        return catalog.createSkill(request.name());
    }

    @PutMapping("/skills/{id}")
    public SkillView renameSkill(@PathVariable Long id, @Valid @RequestBody SkillRequest request) {
        return catalog.renameSkill(id, request.name());
    }

    @DeleteMapping("/skills/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a skill that no category or technician uses")
    public void deleteSkill(@PathVariable Long id) {
        catalog.deleteSkill(id);
    }
}
