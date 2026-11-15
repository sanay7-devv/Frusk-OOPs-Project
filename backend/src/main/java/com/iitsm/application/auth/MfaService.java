package com.iitsm.application.auth;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.OptionalLong;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.event.SecurityAuditEvent;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.Totp;
import com.iitsm.domain.user.User;

/**
 * Two-step verification with an authenticator app (A12, decision DEC-116). Optional and per person: set up (the
 * server makes a secret and shows it once, as text and as an otpauth address for a QR code), enable (the person proves
 * the app works by typing one code), disable (needs a current code). An administrator can reset it for someone who
 * lost their phone. The login itself checks the code ({@link AuthService}); Google sign-in is not asked for it,
 * because Google has already verified the person.
 */
@Service
public class MfaService {

    private static final String ISSUER = "I-ITSM";

    /** What the person needs to add the account to an authenticator app. */
    public record MfaSetup(String secret, String otpauthUri) {
    }

    private final UserRepository users;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public MfaService(UserRepository users, ApplicationEventPublisher events, Clock clock) {
        this.users = users;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public boolean isEnabled(Long userId) {
        return load(userId).isMfaEnabled();
    }

    /** Makes a fresh secret. Not active until {@link #enable} proves the app shows matching codes. */
    @Transactional
    public MfaSetup setup(Long userId) {
        User user = load(userId);
        if (user.isMfaEnabled()) {
            throw new InputValidationException("mfa", "is already turned on; turn it off first");
        }
        String secret = Totp.newSecret(random);
        user.beginMfaSetup(secret);
        return new MfaSetup(secret, Totp.otpauthUri(ISSUER, user.getEmail(), secret));
    }

    @Transactional
    public void enable(Long userId, String code) {
        User user = load(userId);
        String secret = user.getTotpSecret()
                .orElseThrow(() -> new InputValidationException("code", "start the setup first"));
        Instant now = clock.instant();
        OptionalLong step = Totp.verify(secret, code, now, user.totpLastStep());
        if (step.isEmpty()) {
            throw new InputValidationException("code", "is wrong or expired");
        }
        user.enableMfa(step.getAsLong());
        events.publishEvent(new SecurityAuditEvent(AuditAction.MFA_ENABLED, userId,
                "Two-step verification turned on", now));
    }

    @Transactional
    public void disable(Long userId, String code) {
        User user = load(userId);
        if (!user.isMfaEnabled()) {
            throw new InputValidationException("mfa", "is not turned on");
        }
        Instant now = clock.instant();
        if (Totp.verify(user.getTotpSecret().orElseThrow(), code, now, user.totpLastStep()).isEmpty()) {
            throw new InputValidationException("code", "is wrong or expired");
        }
        user.disableMfa();
        events.publishEvent(new SecurityAuditEvent(AuditAction.MFA_DISABLED, userId,
                "Two-step verification turned off", now));
    }

    /** For someone who lost their phone: turns it off without a code. Audited with the administrator's name. */
    @Transactional
    public void adminReset(Long adminId, Long targetUserId) {
        User target = load(targetUserId);
        target.disableMfa();
        events.publishEvent(new SecurityAuditEvent(AuditAction.MFA_DISABLED, adminId,
                "Two-step verification reset by an administrator for user " + targetUserId, clock.instant()));
    }

    private User load(Long userId) {
        return users.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
    }
}
