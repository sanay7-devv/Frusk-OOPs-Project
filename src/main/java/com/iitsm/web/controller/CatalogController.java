package com.iitsm.web.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.catalog.CatalogService;
import com.iitsm.application.catalog.CatalogViews.CategoryNode;
import com.iitsm.application.catalog.CatalogViews.ServiceSummary;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Catalog lists every logged-in user needs, for example to fill the incident report form (contract B.4). */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Catalog")
public class CatalogController {

    private final CatalogService catalog;

    public CatalogController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/services")
    @Operation(summary = "Active IT services (id, name, criticality)")
    public List<ServiceSummary> services() {
        return catalog.activeServices();
    }

    @GetMapping("/categories")
    @Operation(summary = "Active incident categories as a tree")
    public List<CategoryNode> categories() {
        return catalog.activeCategoryTree();
    }
}
