package com.iitsm.domain.user;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;

/**
 * Factory pattern: the one place that builds a valid new {@link User}. Every user starts with the EMPLOYEE role
 * (registration and admin creation alike); other roles are granted afterwards.
 * The password must already be hashed: hashing is an infrastructure concern.
 */
public class UserFactory {

    private final Clock clock;

    public UserFactory(Clock clock) {
        this.clock = clock;
    }

    /** Self-registration and admin creation with a password. */
    public User newEmployee(String name, String email, String passwordHash, String department) {
        return create(name, email, passwordHash, department);
    }

    /** First Google sign-in for an unknown email: no password (decision D-001). */
    public User newGoogleEmployee(String name, String email, String googleSub) {
        User user = create(name, email, null, null);
        user.linkGoogleAccount(googleSub);
        return user;
    }

    private User create(String name, String email, String passwordHash, String department) {
        Instant now = clock.instant();
        User user = new User(name.strip(), normalizeEmail(email), passwordHash, now);
        user.grantEmployeeRole(now, department, null);
        return user;
    }

    /** Emails are compared case-insensitively, so they are stored lower-case and trimmed. */
    public static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }
}
