package com.iitsm.web.dto.incident;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** PUT /incidents/{id}: send only what changes. version (optional) is the one last seen, to detect concurrent edits. */
public record UpdateIncidentRequest(
        @Size(min = 20, max = 5000) String description,
        @Min(1) @Max(5) Integer impact,
        @Min(1) @Max(5) Integer urgency,
        @Min(1) @Max(1000000) Integer affectedUsers,
        Long version) {
}
