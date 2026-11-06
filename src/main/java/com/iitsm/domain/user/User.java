package com.iitsm.domain.user;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import com.iitsm.domain.exception.InputValidationException;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

/**
 * A person using the system. Concrete, and composed of one or more {@link Role}s: the permissions of a user are
 * the union of the permissions of every role they hold.
 * <p>
 * Encapsulation: no public setters. State changes go through behavior methods (login bookkeeping, role
 * changes), and the password hash never leaves this class except for the password check.
 * Build new users with {@link UserFactory}.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    /** BCrypt hash. Null for users who only ever signed in with Google (decision D-001). */
    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    /** Google account id ("sub" claim), set when the account is linked to Google sign-in (decision D-001). */
    @Column(name = "google_sub", unique = true, length = 100)
    private String googleSub;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "failed_logins", nullable = false)
    private int failedLogins;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Role> roles = new HashSet<>();

    protected User() {
    }

    User(String name, String email, String passwordHash, Instant createdAt) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
    }

    // ------------------------------------------------------------------ identity

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Optional<String> getGoogleSub() {
        return Optional.ofNullable(googleSub);
    }

    public void rename(String newName) {
        this.name = newName;
    }

    public void changeEmail(String newEmail) {
        this.email = newEmail;
    }

    public void activate() {
        this.active = true;
    }

    public void deactivate() {
        this.active = false;
    }

    // ------------------------------------------------------------------ password and login bookkeeping

    public boolean hasPassword() {
        return passwordHash != null;
    }

    /** The stored hash, only for the password encoder to compare against. */
    public Optional<String> getPasswordHash() {
        return Optional.ofNullable(passwordHash);
    }

    public void changePasswordHash(String newHash) {
        this.passwordHash = newHash;
    }

    public void linkGoogleAccount(String sub) {
        this.googleSub = sub;
    }

    public int getFailedLogins() {
        return failedLogins;
    }

    public Optional<Instant> getLockedUntil() {
        return Optional.ofNullable(lockedUntil);
    }

    public boolean isLockedAt(Instant now) {
        return lockedUntil != null && now.isBefore(lockedUntil);
    }

    /**
     * Counts a failed login. Reaching {@code maxAttempts} locks the account for {@code lockDuration}.
     * A lock that has already expired is cleared first, so counting starts again from zero.
     */
    public void recordFailedLogin(Instant now, int maxAttempts, Duration lockDuration) {
        clearExpiredLock(now);
        failedLogins++;
        if (failedLogins >= maxAttempts) {
            lockedUntil = now.plus(lockDuration);
            failedLogins = 0;
        }
    }

    public void recordSuccessfulLogin() {
        failedLogins = 0;
        lockedUntil = null;
    }

    private void clearExpiredLock(Instant now) {
        if (lockedUntil != null && !now.isBefore(lockedUntil)) {
            lockedUntil = null;
            failedLogins = 0;
        }
    }

    // ------------------------------------------------------------------ roles and permissions

    public Set<Role> getRoles() {
        return Set.copyOf(roles);
    }

    public Set<RoleType> getRoleTypes() {
        EnumSet<RoleType> types = EnumSet.noneOf(RoleType.class);
        roles.forEach(role -> types.add(role.getType()));
        return types;
    }

    public boolean hasRole(RoleType type) {
        return roles.stream().anyMatch(role -> role.getType() == type);
    }

    /** Union of the permissions of every role held. */
    public Set<PermissionKey> getPermissions() {
        EnumSet<PermissionKey> permissions = EnumSet.noneOf(PermissionKey.class);
        roles.forEach(role -> permissions.addAll(role.getPermissions()));
        return permissions;
    }

    public boolean can(PermissionKey permission) {
        return getPermissions().contains(permission);
    }

    public Optional<EmployeeRole> employeeRole() {
        return findRole(EmployeeRole.class);
    }

    public Optional<TechnicianRole> technicianRole() {
        return findRole(TechnicianRole.class);
    }

    public Optional<AdministratorRole> administratorRole() {
        return findRole(AdministratorRole.class);
    }

    public EmployeeRole grantEmployeeRole(Instant now, String department, String location) {
        requireNotHeld(RoleType.EMPLOYEE);
        EmployeeRole role = new EmployeeRole(this, now, department, location);
        roles.add(role);
        return role;
    }

    public TechnicianRole grantTechnicianRole(Instant now, int experienceLevel, int escalationLevel, int maxLoad) {
        requireNotHeld(RoleType.TECHNICIAN);
        TechnicianRole role = new TechnicianRole(this, now, experienceLevel, escalationLevel, maxLoad);
        roles.add(role);
        return role;
    }

    public AdministratorRole grantAdministratorRole(Instant now, AdminScope scope) {
        requireNotHeld(RoleType.ADMINISTRATOR);
        AdministratorRole role = new AdministratorRole(this, now, scope);
        roles.add(role);
        return role;
    }

    /** Removes a role. Every user keeps EMPLOYEE (API Data Dictionary C.9). */
    public void revokeRole(RoleType type) {
        if (type == RoleType.EMPLOYEE) {
            throw new InputValidationException("roleType", "EMPLOYEE cannot be removed; every user keeps it");
        }
        if (!roles.removeIf(role -> role.getType() == type)) {
            throw new InputValidationException("roleType", "User does not hold the role " + type);
        }
    }

    private void requireNotHeld(RoleType type) {
        if (hasRole(type)) {
            throw new InputValidationException("roleType", "User already holds the role " + type);
        }
    }

    private <R extends Role> Optional<R> findRole(Class<R> roleClass) {
        return roles.stream().filter(roleClass::isInstance).map(roleClass::cast).findFirst();
    }

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof User other && id != null && id.equals(other.id));
    }

    @Override
    public int hashCode() {
        return User.class.hashCode();
    }
}
