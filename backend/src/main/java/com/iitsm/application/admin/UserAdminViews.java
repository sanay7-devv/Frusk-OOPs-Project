package com.iitsm.application.admin;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

import com.iitsm.application.assignment.WorkloadService.Workload;
import com.iitsm.domain.user.AdminScope;
import com.iitsm.domain.user.Availability;
import com.iitsm.domain.user.EmployeeProfile;
import com.iitsm.domain.user.RoleType;
import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.domain.user.User;

/** Admin-side shapes of users and technicians (API Data Dictionary C.5, C.9), built inside the transaction. */
public final class UserAdminViews {

    private UserAdminViews() {
    }

    public record SkillLevel(Long skillId, String name, int proficiency) {
    }

    /** TechnicianListItem (C.5); also the technician part of AdminUser. */
    public record TechnicianView(Long id, String name, String email, int experienceLevel, int escalationLevel,
                                 Availability availability, int currentLoad, int maxLoad, int activeIncidents,
                                 List<SkillLevel> skills) {

        static TechnicianView of(User user, TechnicianProfile profile, Workload workload) {
            List<SkillLevel> skills = profile.getSkills().asMap().entrySet().stream()
                    .map(e -> new SkillLevel(e.getKey().getId(), e.getKey().getName(), e.getValue()))
                    .sorted(Comparator.comparing(SkillLevel::name, String.CASE_INSENSITIVE_ORDER))
                    .toList();
            return new TechnicianView(user.getId(), user.getName(), user.getEmail(), profile.getExperienceLevel(),
                    profile.getEscalationLevel(), profile.getAvailability(), workload.load(), profile.getMaxLoad(),
                    workload.activeIncidents(), skills);
        }
    }

    public record AdministratorView(AdminScope scope) {
    }

    /** AdminUser (C.9). technician and administrator are null when the user does not hold that role. */
    public record AdminUserView(Long id, String name, String email, boolean active, List<RoleType> roles,
                                String department, String location, TechnicianView technician,
                                AdministratorView administrator) {

        static AdminUserView of(User user, Map<Long, Workload> workloads) {
            EmployeeProfile employee = user.employeeRole().map(r -> r.getProfile()).orElse(null);
            TechnicianView technician = user.technicianRole()
                    .map(r -> TechnicianView.of(user, r.getProfile(),
                            workloads.getOrDefault(user.getId(), Workload.NONE)))
                    .orElse(null);
            AdministratorView administrator = user.administratorRole()
                    .map(r -> new AdministratorView(r.getProfile().getScope()))
                    .orElse(null);
            return new AdminUserView(user.getId(), user.getName(), user.getEmail(), user.isActive(),
                    user.getRoleTypes().stream().sorted().toList(),
                    employee == null ? null : employee.getDepartment(),
                    employee == null ? null : employee.getLocation(), technician, administrator);
        }
    }
}
