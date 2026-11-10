package com.iitsm.application.auth;

import java.util.Set;

import com.iitsm.domain.user.PermissionKey;
import com.iitsm.domain.user.RoleType;

/**
 * The caller of the current request, as read from the access token. Application services take it as the actor,
 * so they never depend on Spring Security types.
 */
public record AuthenticatedUser(Long id, String email, Set<RoleType> roles, Set<PermissionKey> permissions) {

    public AuthenticatedUser {
        roles = Set.copyOf(roles);
        permissions = Set.copyOf(permissions);
    }

    public boolean can(PermissionKey permission) {
        return permissions.contains(permission);
    }
}
