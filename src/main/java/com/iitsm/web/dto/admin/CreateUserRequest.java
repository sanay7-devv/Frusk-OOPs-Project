package com.iitsm.web.dto.admin;

import java.util.Set;

import com.iitsm.domain.user.RoleType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** POST /admin/users (C.9). roles must include EMPLOYEE; technician and administrator are required with those roles. */
public record CreateUserRequest(
        @NotBlank @Size(min = 2, max = 100) String name,
        @NotBlank @Email @Size(max = 150) String email,
        @NotNull @Size(min = 8, max = 72)
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).*$", message = "must contain at least one letter and one digit")
        String password,
        @Size(max = 80) String department,
        @Size(max = 80) String location,
        @NotEmpty Set<RoleType> roles,
        @Valid TechnicianRequest technician,
        @Valid AdministratorRequest administrator) {
}
