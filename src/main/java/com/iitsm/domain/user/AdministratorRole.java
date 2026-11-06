package com.iitsm.domain.user;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.ConstraintMode;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;

/**
 * Manages the system: users, catalog, SLA, configuration, reports and audit. Does not handle incidents
 * (no INCIDENT_HANDLE), per the permission matrix in handbook 1.9.
 */
@Entity
@DiscriminatorValue("ADMINISTRATOR")
public class AdministratorRole extends Role {

    private static final Set<PermissionKey> PERMISSIONS = EnumSet.of(
            PermissionKey.INCIDENT_VIEW_ALL,
            PermissionKey.INCIDENT_ASSIGN,
            PermissionKey.INCIDENT_OVERRIDE_PRIORITY,
            PermissionKey.TEAM_VIEW,
            PermissionKey.USER_MANAGE,
            PermissionKey.CATALOG_MANAGE,
            PermissionKey.SLA_MANAGE,
            PermissionKey.CONFIG_MANAGE,
            PermissionKey.REPORT_VIEW,
            PermissionKey.AUDIT_VIEW,
            PermissionKey.SLA_VIOLATION_VIEW);

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "user_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private AdministratorProfile profile;

    protected AdministratorRole() {
    }

    AdministratorRole(User user, Instant grantedAt, AdminScope scope) {
        super(user, grantedAt);
        this.profile = new AdministratorProfile(user, scope);
    }

    @Override
    public RoleType getType() {
        return RoleType.ADMINISTRATOR;
    }

    @Override
    public Set<PermissionKey> getPermissions() {
        return Set.copyOf(PERMISSIONS);
    }

    public AdministratorProfile getProfile() {
        return profile;
    }
}
