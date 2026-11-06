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

/** Every user holds this role: report incidents and follow their own ones. */
@Entity
@DiscriminatorValue("EMPLOYEE")
public class EmployeeRole extends Role {

    private static final Set<PermissionKey> PERMISSIONS =
            EnumSet.of(PermissionKey.INCIDENT_CREATE, PermissionKey.INCIDENT_VIEW_OWN);

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "user_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private EmployeeProfile profile;

    protected EmployeeRole() {
    }

    EmployeeRole(User user, Instant grantedAt, String department, String location) {
        super(user, grantedAt);
        this.profile = new EmployeeProfile(user, department, location);
    }

    @Override
    public RoleType getType() {
        return RoleType.EMPLOYEE;
    }

    @Override
    public Set<PermissionKey> getPermissions() {
        return Set.copyOf(PERMISSIONS);
    }

    public EmployeeProfile getProfile() {
        return profile;
    }
}
