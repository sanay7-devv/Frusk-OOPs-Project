package com.iitsm.web.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.config.ConfigService.ConfigItemView;
import com.iitsm.web.dto.catalog.ConfigValueRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

/**
 * Runtime settings: strategies, weights, thresholds (contract B.4, app_config). Needs CONFIG_MANAGE. A change takes
 * effect immediately, with no restart; invalid values come back as fieldErrors keyed by the config key.
 */
@RestController
@RequestMapping("/api/v1/admin/config")
@PreAuthorize("hasAuthority('CONFIG_MANAGE')")
@Tag(name = "Admin: configuration")
public class AdminConfigController {

    private final ConfigService config;

    public AdminConfigController(ConfigService config) {
        this.config = config;
    }

    @GetMapping
    @Operation(summary = "Every setting with its current value, default and meaning")
    public List<ConfigItemView> settings() {
        return config.list();
    }

    @PutMapping
    @Operation(summary = "Change one or more settings at once; all are validated together")
    public List<ConfigItemView> update(@AuthenticationPrincipal AuthenticatedUser caller,
                                       @RequestBody @NotEmpty List<@Valid ConfigValueRequest> changes) {
        Map<String, String> byKey = new LinkedHashMap<>();
        changes.forEach(change -> byKey.put(change.key().strip(), change.value()));
        return config.update(caller.id(), byKey);
    }
}
