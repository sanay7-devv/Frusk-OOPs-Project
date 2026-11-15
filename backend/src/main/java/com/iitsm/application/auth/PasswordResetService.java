package com.iitsm.application.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.event.SecurityAuditEvent;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.repository.PasswordResetTokenRepository;
import com.iitsm.domain.repository.RefreshTokenRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.PasswordPolicy;
import com.iitsm.domain.user.PasswordResetToken;
import com.iitsm.domain.user.RefreshToken;
import com.iitsm.domain.user.User;
import com.iitsm.domain.user.UserFactory;

/**
 * Forgotten password (A12, decision DEC-116). Two steps, both public:
 * <ol>
 *   <li><b>Request</b>: whatever the e-mail, the answer is the same (no way to find out who has an account). If the
 *       account exists and is active, a single-use link with a random secret is mailed; asking again cancels the
 *       older links. Only a SHA-256 hash of the secret is stored.</li>
 *   <li><b>Confirm</b>: the secret and a new password. The password must pass the same policy as registration, the
 *       link is used up, every session of the account is signed out and a lock from failed logins is cleared.</li>
 * </ol>
 * Google-only accounts (no password yet) may use it to set a first password.
 */
@Service
public class PasswordResetService {

    private static final int SECRET_BYTES = 32;

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final PasswordResetNotifier notifier;
    private final ConfigService config;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(UserRepository users, PasswordResetTokenRepository tokens,
                                RefreshTokenRepository refreshTokens, PasswordEncoder encoder,
                                PasswordResetNotifier notifier, ConfigService config,
                                ApplicationEventPublisher events, Clock clock) {
        this.users = users;
        this.tokens = tokens;
        this.refreshTokens = refreshTokens;
        this.encoder = encoder;
        this.notifier = notifier;
        this.config = config;
        this.events = events;
        this.clock = clock;
    }

    /** Sends a reset link if the account exists and is active; says nothing either way. */
    @Transactional
    public void request(String email) {
        Instant now = clock.instant();
        users.findByEmail(UserFactory.normalizeEmail(email)).filter(User::isActive).ifPresent(user -> {
            tokens.findByUser_IdAndUsedAtIsNull(user.getId()).forEach(old -> old.markUsed(now));
            AppSettings settings = config.current();
            int minutes = settings.intValue(ConfigKey.AUTH_PASSWORD_RESET_MINUTES);
            String secret = newSecret();
            tokens.save(new PasswordResetToken(user, hash(secret), now.plus(Duration.ofMinutes(minutes)), now));
            String link = settings.raw(ConfigKey.NOTIFICATION_LINK_BASE_URL).replaceAll("/+$", "")
                    + "/reset-password?token=" + secret;
            notifier.send(user.getEmail(), user.getName(), link, minutes);
            events.publishEvent(new SecurityAuditEvent(AuditAction.PASSWORD_RESET_REQUESTED, user.getId(),
                    "Password reset link requested; valid " + minutes + " minutes", now));
        });
    }

    /** Sets the new password. A wrong, used or expired link is one and the same 400. */
    @Transactional
    public void confirm(String secret, String newPassword) {
        Instant now = clock.instant();
        PasswordResetToken token = tokens.findByTokenHash(hash(secret == null ? "" : secret.strip()))
                .filter(t -> t.isUsableAt(now))
                .orElseThrow(() -> new InputValidationException("token", "is invalid or has expired"));
        User user = token.getUser();
        PasswordPolicy.check(newPassword, user.getName(), user.getEmail())
                .ifPresent(problem -> {
                    throw new InputValidationException("newPassword", problem);
                });
        user.changePasswordHash(encoder.encode(newPassword));
        user.recordSuccessfulLogin(); // clears the failed-login counter and any lock
        token.markUsed(now);
        tokens.findByUser_IdAndUsedAtIsNull(user.getId()).forEach(other -> other.markUsed(now));
        refreshTokens.findByUser_IdAndRevokedFalse(user.getId()).forEach(RefreshToken::revoke);
        events.publishEvent(new SecurityAuditEvent(AuditAction.PASSWORD_CHANGED, user.getId(),
                "Password changed with a reset link; every session was signed out", now));
    }

    private String newSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String secret) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is always available in the JDK", ex);
        }
    }
}
