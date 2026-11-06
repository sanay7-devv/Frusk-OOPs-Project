package com.iitsm.web.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.iitsm.application.admin.UserAdminService;
import com.iitsm.application.admin.UserAdminService.SkillAssignment;
import com.iitsm.application.admin.UserAdminService.TechnicianSpec;
import com.iitsm.application.admin.UserAdminViews.AdminUserView;
import com.iitsm.application.admin.UserAdminViews.TechnicianView;
import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.domain.user.AdminScope;
import com.iitsm.domain.user.RoleType;
import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.web.dto.admin.AddRoleRequest;
import com.iitsm.web.dto.admin.AdministratorRequest;
import com.iitsm.web.dto.admin.CreateUserRequest;
import com.iitsm.web.dto.admin.SkillLevelRequest;
import com.iitsm.web.dto.admin.TechnicianRequest;
import com.iitsm.web.dto.admin.UpdateTechnicianRequest;
import com.iitsm.web.dto.admin.UpdateUserRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/** Admin management of users, roles and technician profiles (contract B.4). Needs USER_MANAGE. */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAuthority('USER_MANAGE')")
@Tag(name = "Admin: users and technicians")
public class AdminUserController {

    private final UserAdminService admin;

    public AdminUserController(UserAdminService admin) {
        this.admin = admin;
    }

    @GetMapping("/users")
    @Operation(summary = "All users with roles, profiles and technician workload")
    public List<AdminUserView> users() {
        return admin.allUsers();
    }

    @GetMapping("/users/{id}")
    public AdminUserView user(@PathVariable Long id) {
        return admin.user(id);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a user; roles must include EMPLOYEE, extra roles need their profile")
    public AdminUserView createUser(@Valid @RequestBody CreateUserRequest request) {
        return admin.createUser(request.name(), request.email(), request.password(), request.department(),
                request.location(), request.roles(), spec(request.technician()), scope(request.administrator()));
    }

    @PutMapping("/users/{id}")
    public AdminUserView updateUser(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id,
                                    @Valid @RequestBody UpdateUserRequest request) {
        return admin.updateUser(caller.id(), id, request.name(), request.active(), request.department(),
                request.location());
    }

    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate a user (never deleted) and end their sessions")
    public void deactivateUser(@AuthenticationPrincipal AuthenticatedUser caller, @PathVariable Long id) {
        admin.deactivateUser(caller.id(), id);
    }

    @PostMapping("/users/{id}/roles")
    @Operation(summary = "Add TECHNICIAN (with profile) or ADMINISTRATOR (with scope)")
    public AdminUserView addRole(@PathVariable Long id, @Valid @RequestBody AddRoleRequest request) {
        return admin.addRole(id, request.roleType(), spec(request.technician()), scope(request.administrator()));
    }

    @DeleteMapping("/users/{id}/roles/{roleType}")
    @Operation(summary = "Remove a role (EMPLOYEE stays; TECHNICIAN only without active incidents)")
    public AdminUserView removeRole(@PathVariable Long id, @PathVariable RoleType roleType) {
        return admin.removeRole(id, roleType);
    }

    @PutMapping("/technicians/{id}/skills")
    @Operation(summary = "Replace a technician's skills")
    public TechnicianView replaceSkills(@PathVariable Long id,
                                       @RequestBody List<@Valid SkillLevelRequest> skills) {
        return admin.replaceSkills(id, skills.stream()
                .map(s -> new SkillAssignment(s.skillId(), s.proficiency()))
                .toList());
    }

    @PutMapping("/technicians/{id}")
    @Operation(summary = "Change experience, escalation level (1 = team lead), max load or availability")
    public TechnicianView updateTechnician(@PathVariable Long id,
                                           @Valid @RequestBody UpdateTechnicianRequest request) {
        return admin.updateTechnician(id, request.experienceLevel(), request.escalationLevel(), request.maxLoad(),
                request.availability());
    }

    private static TechnicianSpec spec(TechnicianRequest request) {
        if (request == null) {
            return null;
        }
        List<SkillAssignment> skills = request.skills() == null ? List.of() : request.skills().stream()
                .map(s -> new SkillAssignment(s.skillId(), s.proficiency()))
                .toList();
        return new TechnicianSpec(request.experienceLevel(), request.escalationLevel(),
                request.maxLoad() == null ? TechnicianProfile.DEFAULT_MAX_LOAD : request.maxLoad(),
                request.availability(), skills);
    }

    private static AdminScope scope(AdministratorRequest request) {
        return request == null ? null : request.scope();
    }
}
