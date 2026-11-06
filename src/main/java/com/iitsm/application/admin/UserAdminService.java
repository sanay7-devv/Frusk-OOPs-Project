package com.iitsm.application.admin;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.admin.UserAdminViews.AdminUserView;
import com.iitsm.application.admin.UserAdminViews.TechnicianView;
import com.iitsm.application.assignment.WorkloadService;
import com.iitsm.application.assignment.WorkloadService.Workload;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.RefreshTokenRepository;
import com.iitsm.domain.repository.SkillRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.AdminScope;
import com.iitsm.domain.user.Availability;
import com.iitsm.domain.user.RefreshToken;
import com.iitsm.domain.user.RoleType;
import com.iitsm.domain.user.Skill;
import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.domain.user.TechnicianRole;
import com.iitsm.domain.user.User;
import com.iitsm.domain.user.UserFactory;

/**
 * Admin management of users, roles and technicians (API contract B.4 /admin/users, /admin/technicians, and
 * /technicians). Guard rails: every user keeps EMPLOYEE; an admin cannot deactivate themselves; the TECHNICIAN role
 * cannot be removed while the person still has active incidents; deactivating a user ends all their sessions.
 */
@Service
public class UserAdminService {

    /** Profile data needed when a user becomes a technician. */
    public record TechnicianSpec(int experienceLevel, int escalationLevel, int maxLoad, Availability availability,
                                 List<SkillAssignment> skills) {
    }

    public record SkillAssignment(Long skillId, int proficiency) {
    }

    private final UserRepository users;
    private final SkillRepository skills;
    private final IncidentRepository incidents;
    private final RefreshTokenRepository refreshTokens;
    private final WorkloadService workloadService;
    private final UserFactory userFactory;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public UserAdminService(UserRepository users, SkillRepository skills, IncidentRepository incidents,
                            RefreshTokenRepository refreshTokens, WorkloadService workloadService,
                            UserFactory userFactory,
                            PasswordEncoder passwordEncoder, Clock clock) {
        this.users = users;
        this.skills = skills;
        this.incidents = incidents;
        this.refreshTokens = refreshTokens;
        this.workloadService = workloadService;
        this.userFactory = userFactory;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ users

    @Transactional(readOnly = true)
    public List<AdminUserView> allUsers() {
        Map<Long, Workload> workloads = workloadService.all();
        return users.findAllByOrderByNameAsc().stream().map(u -> AdminUserView.of(u, workloads)).toList();
    }

    @Transactional(readOnly = true)
    public AdminUserView user(Long id) {
        return AdminUserView.of(load(id), workloadService.all());
    }

    /** Creates a user with EMPLOYEE plus any other roles; each extra role needs its profile data. */
    @Transactional
    public AdminUserView createUser(String name, String email, String rawPassword, String department,
                                    String location, Set<RoleType> roles, TechnicianSpec technician,
                                    AdminScope adminScope) {
        if (roles == null || !roles.contains(RoleType.EMPLOYEE)) {
            throw new InputValidationException("roles", "must include EMPLOYEE");
        }
        String normalizedEmail = UserFactory.normalizeEmail(email);
        if (users.existsByEmail(normalizedEmail)) {
            throw new InputValidationException("email", "is already registered");
        }
        User user = userFactory.newEmployee(name, normalizedEmail, passwordEncoder.encode(rawPassword),
                department, location);
        Instant now = clock.instant();
        if (roles.contains(RoleType.TECHNICIAN)) {
            grantTechnician(user, technician, now);
        }
        if (roles.contains(RoleType.ADMINISTRATOR)) {
            grantAdministrator(user, adminScope, now);
        }
        try {
            user = users.save(user);
        } catch (DataIntegrityViolationException ex) {
            throw new InputValidationException("email", "is already registered");
        }
        return AdminUserView.of(user, workloadService.all());
    }

    /** Name, active flag, department and location; null leaves a value unchanged. */
    @Transactional
    public AdminUserView updateUser(Long callerId, Long id, String name, Boolean active, String department,
                                    String location) {
        User user = load(id);
        if (name != null) {
            user.rename(name.strip());
        }
        if (active != null) {
            if (active) {
                user.activate();
            } else {
                deactivate(callerId, user);
            }
        }
        if (department != null || location != null) {
            user.employeeRole().ifPresent(role -> role.getProfile().moveTo(
                    department != null ? department : role.getProfile().getDepartment(),
                    location != null ? location : role.getProfile().getLocation()));
        }
        return AdminUserView.of(user, workloadService.all());
    }

    /** DELETE /admin/users/{id}: users are never deleted (incidents and audit keep pointing at them). */
    @Transactional
    public void deactivateUser(Long callerId, Long id) {
        deactivate(callerId, load(id));
    }

    private void deactivate(Long callerId, User user) {
        if (user.getId().equals(callerId)) {
            throw new InputValidationException("active", "you cannot deactivate your own account");
        }
        user.deactivate();
        refreshTokens.findByUser_IdAndRevokedFalse(user.getId()).forEach(RefreshToken::revoke);
    }

    // ------------------------------------------------------------------ roles

    @Transactional
    public AdminUserView addRole(Long id, RoleType role, TechnicianSpec technician, AdminScope adminScope) {
        User user = load(id);
        Instant now = clock.instant();
        switch (role) {
            case EMPLOYEE -> throw new InputValidationException("roleType", "every user already holds EMPLOYEE");
            case TECHNICIAN -> grantTechnician(user, technician, now);
            case ADMINISTRATOR -> grantAdministrator(user, adminScope, now);
        }
        return AdminUserView.of(user, workloadService.all());
    }

    @Transactional
    public AdminUserView removeRole(Long id, RoleType role) {
        User user = load(id);
        if (role == RoleType.TECHNICIAN) {
            int active = incidents.findByAssignee_IdAndStatusIn(id, IncidentStatus.ACTIVE_WORK).size();
            if (active > 0) {
                throw new InputValidationException("roleType",
                        user.getName() + " still has " + active + " active incident(s); reassign them first");
            }
        }
        user.revokeRole(role);
        return AdminUserView.of(user, workloadService.all());
    }

    // ------------------------------------------------------------------ technicians

    @Transactional(readOnly = true)
    public List<TechnicianView> technicians(Long skillId, Availability availability) {
        Map<Long, Workload> workloads = workloadService.all();
        List<TechnicianView> result = new ArrayList<>();
        for (User user : users.findAllTechnicians()) {
            if (!user.isActive()) {
                continue;
            }
            TechnicianProfile profile = user.technicianRole().map(TechnicianRole::getProfile).orElseThrow();
            if (availability != null && profile.getAvailability() != availability) {
                continue;
            }
            if (skillId != null && profile.getSkills().asMap().keySet().stream()
                    .noneMatch(skill -> skill.getId().equals(skillId))) {
                continue;
            }
            result.add(TechnicianView.of(user, profile, workloads.getOrDefault(user.getId(), Workload.NONE)));
        }
        return result;
    }

    /** PUT /admin/technicians/{id}/skills: replaces the whole skill list. */
    @Transactional
    public TechnicianView replaceSkills(Long id, List<SkillAssignment> newSkills) {
        User user = load(id);
        TechnicianProfile profile = technicianProfile(user);
        profile.getSkills().replaceWith(resolveSkills(newSkills));
        return TechnicianView.of(user, profile, workloadService.all().getOrDefault(id, Workload.NONE));
    }

    /** PUT /admin/technicians/{id}: experience, escalation level (1 = team lead), max load, availability. */
    @Transactional
    public TechnicianView updateTechnician(Long id, Integer experienceLevel, Integer escalationLevel,
                                           Integer maxLoad, Availability availability) {
        User user = load(id);
        TechnicianProfile profile = technicianProfile(user);
        if (experienceLevel != null) {
            profile.changeExperienceLevel(experienceLevel);
        }
        if (escalationLevel != null) {
            profile.changeEscalationLevel(escalationLevel);
        }
        if (maxLoad != null) {
            profile.changeMaxLoad(maxLoad);
        }
        if (availability != null) {
            profile.changeAvailability(availability);
        }
        return TechnicianView.of(user, profile, workloadService.all().getOrDefault(id, Workload.NONE));
    }

    /** PUT /technicians/me/availability: a technician marks themselves AVAILABLE, BUSY, AWAY or OFF_DUTY. */
    @Transactional
    public TechnicianView changeOwnAvailability(Long callerId, Availability availability) {
        return updateTechnician(callerId, null, null, null, availability);
    }

    // ------------------------------------------------------------------ helpers

    private void grantTechnician(User user, TechnicianSpec spec, Instant now) {
        if (spec == null) {
            throw new InputValidationException("technician", "is required when adding the TECHNICIAN role");
        }
        TechnicianRole role = user.grantTechnicianRole(now, spec.experienceLevel(), spec.escalationLevel(),
                spec.maxLoad());
        if (spec.availability() != null) {
            role.getProfile().changeAvailability(spec.availability());
        }
        if (spec.skills() != null) {
            role.getProfile().getSkills().replaceWith(resolveSkills(spec.skills()));
        }
    }

    private static void grantAdministrator(User user, AdminScope scope, Instant now) {
        if (scope == null) {
            throw new InputValidationException("administrator", "a scope is required when adding ADMINISTRATOR");
        }
        user.grantAdministratorRole(now, scope);
    }

    private Map<Skill, Integer> resolveSkills(List<SkillAssignment> wanted) {
        Map<Skill, Integer> resolved = new HashMap<>();
        Set<Long> seen = new HashSet<>();
        for (SkillAssignment assignment : wanted) {
            if (!seen.add(assignment.skillId())) {
                throw new InputValidationException("skills", "skill " + assignment.skillId() + " is listed twice");
            }
            Skill skill = skills.findById(assignment.skillId())
                    .orElseThrow(() -> new InputValidationException("skills",
                            "unknown skill id " + assignment.skillId()));
            resolved.put(skill, assignment.proficiency());
        }
        return resolved;
    }

    private static TechnicianProfile technicianProfile(User user) {
        return user.technicianRole()
                .map(TechnicianRole::getProfile)
                .orElseThrow(() -> new InputValidationException("id", user.getName() + " is not a technician"));
    }

    private User load(Long id) {
        return users.findById(id).orElseThrow(() -> new UserNotFoundException(id));
    }
}
