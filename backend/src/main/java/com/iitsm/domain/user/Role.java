package com.iitsm.domain.user;

import java.time.Instant;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.DiscriminatorType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * A role a user holds. Abstract: each concrete role knows its own permissions (polymorphism), and a user is
 * composed of one or more roles, so one person can be an employee and a technician at once.
 * <p>
 * Stored in user_roles, one row per role held; role_type is the discriminator. Role-specific data lives in the
 * matching *_profiles table, owned by the subclass.
 */
@Entity
@Table(name = "user_roles", uniqueConstraints = @UniqueConstraint(
        name = "uk_user_roles_user_role", columnNames = {"user_id", "role_type"}))
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "role_type", discriminatorType = DiscriminatorType.STRING, length = 20)
public abstract class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;

    protected Role() {
    }

    protected Role(User user, Instant grantedAt) {
        this.user = user;
        this.grantedAt = grantedAt;
    }

    public abstract RoleType getType();

    public abstract Set<PermissionKey> getPermissions();

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Instant getGrantedAt() {
        return grantedAt;
    }
}
