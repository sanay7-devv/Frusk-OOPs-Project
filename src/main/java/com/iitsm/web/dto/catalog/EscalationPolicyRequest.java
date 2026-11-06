package com.iitsm.web.dto.catalog;

import com.iitsm.domain.priority.Priority;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Create or update an escalation policy (C.9). On update only timeoutMinutes changes. */
public record EscalationPolicyRequest(
        @NotNull Priority priority,
        @NotNull @Min(1) @Max(3) Integer level,
        @NotNull @Min(1) @Max(1440) Integer timeoutMinutes) {
}
