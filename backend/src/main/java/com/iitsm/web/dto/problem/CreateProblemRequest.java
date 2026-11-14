package com.iitsm.web.dto.problem;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** POST /problems: the incidents to group; the title defaults to the lead incident's title. */
public record CreateProblemRequest(
        @Size(max = 200) String title,
        @NotEmpty @Size(max = 50) List<Long> incidentIds) {
}
