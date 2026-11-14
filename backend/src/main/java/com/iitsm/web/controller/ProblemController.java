package com.iitsm.web.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.problem.ProblemService;
import com.iitsm.application.problem.ProblemViews.ProblemView;
import com.iitsm.domain.problem.ProblemStatus;
import com.iitsm.web.openapi.ApiErrors;
import com.iitsm.web.openapi.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Problem records: groups of correlated incidents (API contract B.4, module M12). Team leads and administrators. */
@RestController
@RequestMapping("/api/v1/problems")
@Tag(name = "Problems")
public class ProblemController {

    private final ProblemService problems;

    public ProblemController(ProblemService problems) {
        this.problems = problems;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('TEAM_VIEW')")
    @Operation(summary = "Problem records, newest first, optionally only OPEN or RESOLVED (admin, team lead)")
    public List<ProblemView> list(@RequestParam(required = false) ProblemStatus status) {
        return problems.list(status);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('TEAM_VIEW')")
    @Operation(summary = "One problem record with its lead incident and every linked incident")
    @ApiErrors({ErrorCode.NOT_FOUND})
    public ProblemView get(@PathVariable Long id) {
        return problems.get(id);
    }
}
