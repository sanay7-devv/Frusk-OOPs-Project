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
 * Handles incidents. A team lead is not a separate class: it is a technician whose escalation level is 1, and
 * that one fact widens the permissions (handbook 1.9).
 */
@Entity
@DiscriminatorValue("TECHNICIAN")
public class TechnicianRole extends Role {

    private static final Set<PermissionKey> TECHNICIAN_PERMISSIONS = EnumSet.of(
            PermissionKey.INCIDENT_VIEW_ASSIGNED,
            PermissionKey.INCIDENT_HANDLE,
            PermissionKey.WORKLOAD_VIEW);

    private static final Set<PermissionKey> TEAM_LEAD_EXTRAS = EnumSet.of(
            PermissionKey.INCIDENT_VIEW_TEAM,
            PermissionKey.TEAM_VIEW,
            PermissionKey.INCIDENT_ASSIGN,
            PermissionKey.INCIDENT_OVERRIDE_PRIORITY,
            PermissionKey.SLA_VIOLATION_VIEW);

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "user_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private TechnicianProfile profile;

    protected TechnicianRole() {
    }

    TechnicianRole(User user, Instant grantedAt, int experienceLevel, int escalationLevel, int maxLoad) {
        super(user, grantedAt);
        this.profile = new TechnicianProfile(user, experienceLevel, escalationLevel, maxLoad);
    }

    @Override
    public RoleType getType() {
        return RoleType.TECHNICIAN;
    }

    @Override
    public Set<PermissionKey> getPermissions() {
        EnumSet<PermissionKey> permissions = EnumSet.copyOf(TECHNICIAN_PERMISSIONS);
        if (profile.isTeamLead()) {
            permissions.addAll(TEAM_LEAD_EXTRAS);
        }
        return Set.copyOf(permissions);
    }

    public TechnicianProfile getProfile() {
        return profile;
    }
}
