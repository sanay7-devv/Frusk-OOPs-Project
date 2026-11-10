package com.iitsm.web.dto.admin;

import jakarta.validation.constraints.Size;

/** PUT /admin/users/{id}: send only what changes. */
public record UpdateUserRequest(
        @Size(min = 2, max = 100) String name,
        Boolean active,
        @Size(max = 80) String department,
        @Size(max = 80) String location) {
}
