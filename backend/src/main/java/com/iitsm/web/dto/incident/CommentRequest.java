package com.iitsm.web.dto.incident;

import com.iitsm.domain.incident.CommentVisibility;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /incidents/{id}/comments. visibility defaults to PUBLIC; INTERNAL only for technicians and admins. */
public record CommentRequest(
        @NotBlank @Size(max = 4000) String body,
        CommentVisibility visibility) {
}
