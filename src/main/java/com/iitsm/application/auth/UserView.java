package com.iitsm.application.auth;

import java.util.Set;

import com.iitsm.domain.user.AdminScope;
import com.iitsm.domain.user.Availability;
import com.iitsm.domain.user.PermissionKey;
import com.iitsm.domain.user.RoleType;
import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.domain.user.User;

/**
 * Read-only snapshot of a user (API Data Dictionary C.3 CurrentUser). Built inside the transaction, so the web
 * layer never touches lazy JPA collections and never sees the entity.
 */
public record UserView(Long id, String name, String email, Set<RoleType> roles, Set<PermissionKey> permissions,
                       TechnicianView technician, AdministratorView administrator) {

    public record TechnicianView(int escalationLevel, Availability availability) {
    }

    public record AdministratorView(AdminScope scope) {
    }

    public static UserView of(User user) {
        TechnicianView technician = user.technicianRole()
                .map(role -> {
                    TechnicianProfile profile = role.getProfile();
                    return new TechnicianView(profile.getEscalationLevel(), profile.getAvailability());
                })
                .orElse(null);
        AdministratorView administrator = user.administratorRole()
                .map(role -> new AdministratorView(role.getProfile().getScope()))
                .orElse(null);
        return new UserView(user.getId(), user.getName(), user.getEmail(), user.getRoleTypes(),
                user.getPermissions(), technician, administrator);
    }
}
