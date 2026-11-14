package com.iitsm.application.auth;

import java.time.Clock;
import java.time.Instant;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthService.AuthResult;
import com.iitsm.application.auth.GoogleIdTokenVerifier.GoogleIdentity;
import com.iitsm.application.auth.GoogleIdTokenVerifier.RejectedTokenException;
import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.event.SecurityAuditEvent;
import com.iitsm.domain.exception.AccountLockedException;
import com.iitsm.domain.exception.InvalidCredentialsException;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.User;
import com.iitsm.domain.user.UserFactory;

/**
 * Google sign-in (module M2b, DEC-04, DEC-100 to DEC-103). Kept apart from {@link AuthService} so the password flows
 * stay untouched; it reuses AuthService's token issuing.
 * <p>
 * Rules: a bad token (signature, audience, issuer, expiry) answers 401 TOKEN_INVALID. Every account-level problem
 * (unverified email, no account with auto-registration off, deactivated, linked to another Google account)
 * answers 401 INVALID_CREDENTIALS, the same as a wrong password, so email addresses cannot be probed. A locked
 * account answers 423. Failures are audited as LOGIN_FAILED but do not count toward lockout: a signed Google token
 * cannot be guessed, and counting would let anyone lock a victim out. A success resets the counter.
 * Lookup is by {@code google_sub} first (it never changes), then by verified email, which links the account.
 */
@Service
public class GoogleSignInService {

    private final GoogleIdTokenVerifier verifier;
    private final UserRepository users;
    private final UserFactory userFactory;
    private final AuthService authService;
    private final ConfigService config;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public GoogleSignInService(GoogleIdTokenVerifier verifier, UserRepository users, UserFactory userFactory,
                               AuthService authService, ConfigService config, ApplicationEventPublisher events,
                               Clock clock) {
        this.verifier = verifier;
        this.users = users;
        this.userFactory = userFactory;
        this.authService = authService;
        this.config = config;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public AuthResult signIn(String idToken) {
        Instant now = clock.instant();
        GoogleIdentity identity;
        try {
            identity = verifier.verify(idToken);
        } catch (RejectedTokenException ex) {
            failed(null, "invalid token: " + ex.reason(), now);
            throw ex;
        }
        if (!identity.emailVerified()) {
            failed(null, "Google email not verified " + UserFactory.normalizeEmail(identity.email()), now);
            throw new InvalidCredentialsException();
        }
        String email = UserFactory.normalizeEmail(identity.email());
        User user = users.findByGoogleSub(identity.subject()).or(() -> users.findByEmail(email)).orElse(null);
        if (user == null) {
            return register(identity, email, now);
        }
        AppSettings settings = config.current();
        if (user.isLockedAt(now)) {
            failed(user.getId(), "account locked", now);
            throw new AccountLockedException(settings.intValue(ConfigKey.SECURITY_LOCKOUT_MINUTES));
        }
        if (!user.isActive()) {
            failed(user.getId(), "account deactivated", now);
            throw new InvalidCredentialsException();
        }
        if (user.getGoogleSub().filter(sub -> !sub.equals(identity.subject())).isPresent()) {
            failed(user.getId(), "email belongs to an account linked to a different Google account", now);
            throw new InvalidCredentialsException();
        }
        if (user.getGoogleSub().isEmpty()) {
            user.linkGoogleAccount(identity.subject());
        }
        user.recordSuccessfulLogin();
        return authService.issueTokens(user, now);
    }

    private AuthResult register(GoogleIdentity identity, String email, Instant now) {
        if (!"true".equals(config.current().raw(ConfigKey.AUTH_GOOGLE_AUTOREGISTER))) {
            failed(null, "no account for " + email + " (auto-registration is off)", now);
            throw new InvalidCredentialsException();
        }
        String name = identity.name() == null || identity.name().isBlank()
                ? email.substring(0, email.indexOf('@')) : identity.name().strip();
        User user = userFactory.newGoogleEmployee(name.length() <= 100 ? name : name.substring(0, 100),
                email, identity.subject());
        try {
            user = users.save(user);
        } catch (DataIntegrityViolationException ex) {
            // the same person signing up twice at the same moment: the unique constraint decides
            failed(null, "concurrent Google registration for " + email, now);
            throw new InvalidCredentialsException();
        }
        return authService.issueTokens(user, now);
    }

    /** Audited in its own transaction (AuditListener), so the record survives the failed request. */
    private void failed(Long userId, String reason, Instant now) {
        String text = "Failed Google login: " + reason;
        events.publishEvent(new SecurityAuditEvent(AuditAction.LOGIN_FAILED, userId,
                text.length() <= 250 ? text : text.substring(0, 250), now));
    }
}
