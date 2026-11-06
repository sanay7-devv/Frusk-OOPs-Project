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

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AccessTokenIssuer.IssuedAccessToken;
import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.AccountLockedException;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.InvalidCredentialsException;
import com.iitsm.domain.exception.TokenInvalidException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.repository.RefreshTokenRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.RefreshToken;
import com.iitsm.domain.user.User;
import com.iitsm.domain.user.UserFactory;

/**
 * Registration, login, token refresh and logout (module M2).
 * <p>
 * Rules (handbook 1.7, 2.5 M2): the same error for an unknown email and a wrong password; five failures lock the
 * account for 15 minutes; refresh tokens are random, stored only as a SHA-256 hash, rotated on every use and
 * revoked on logout. Re-using an already rotated refresh token is treated as theft and revokes all of the user's
 * sessions.
 */
@Service
public class AuthService {

    private static final int REFRESH_TOKEN_BYTES = 32;

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final UserFactory userFactory;
    private final PasswordEncoder passwordEncoder;
    private final AccessTokenIssuer accessTokenIssuer;
    private final Clock clock;
    private final ConfigService config;
    private final Duration refreshTokenLifetime;
    private final SecureRandom random = new SecureRandom();
    /** Compared against when the email is unknown, so both failure paths take the same BCrypt time. */
    private final String dummyHash;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, UserFactory userFactory,
                       PasswordEncoder passwordEncoder, AccessTokenIssuer accessTokenIssuer, Clock clock,
                       ConfigService config,
                       @Value("${app.jwt.refresh-token-days}") int refreshTokenDays) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.userFactory = userFactory;
        this.passwordEncoder = passwordEncoder;
        this.accessTokenIssuer = accessTokenIssuer;
        this.clock = clock;
        this.config = config;
        this.refreshTokenLifetime = Duration.ofDays(refreshTokenDays);
        this.dummyHash = passwordEncoder.encode("timing-equalizer-not-a-password");
    }

    /** Access and refresh token plus the user they belong to. */
    public record AuthResult(String accessToken, long expiresInSeconds, String refreshToken, UserView user) {
    }

    @Transactional
    public AuthResult register(String name, String email, String rawPassword, String department) {
        String normalizedEmail = UserFactory.normalizeEmail(email);
        if (users.existsByEmail(normalizedEmail)) {
            throw emailTaken();
        }
        User user = userFactory.newEmployee(name, normalizedEmail, passwordEncoder.encode(rawPassword), department);
        try {
            user = users.save(user);
        } catch (DataIntegrityViolationException ex) {
            // two registrations with the same email at the same moment: the unique constraint decides
            throw emailTaken();
        }
        return issueTokens(user, clock.instant());
    }

    /** Failed attempts must be saved even though the call ends in an exception, hence noRollbackFor. */
    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public AuthResult login(String email, String rawPassword) {
        Instant now = clock.instant();
        User user = users.findByEmail(UserFactory.normalizeEmail(email)).orElse(null);
        if (user == null) {
            passwordEncoder.matches(rawPassword, dummyHash);
            throw new InvalidCredentialsException();
        }
        AppSettings settings = config.current(); // live app_config values: a change applies to the next login
        if (user.isLockedAt(now)) {
            throw new AccountLockedException(settings.intValue(ConfigKey.SECURITY_LOCKOUT_MINUTES));
        }
        boolean passwordMatches = user.getPasswordHash()
                .map(hash -> passwordEncoder.matches(rawPassword, hash))
                .orElse(false); // Google-only users have no password (D-001)
        if (!passwordMatches || !user.isActive()) {
            user.recordFailedLogin(now, settings.lockoutAttempts(), settings.lockoutDuration());
            throw new InvalidCredentialsException();
        }
        user.recordSuccessfulLogin();
        return issueTokens(user, now);
    }

    /** Revoking every session on token re-use must survive the exception, hence noRollbackFor. */
    @Transactional(noRollbackFor = TokenInvalidException.class)
    public AuthResult refresh(String rawRefreshToken) {
        Instant now = clock.instant();
        RefreshToken stored = refreshTokens.findByTokenHash(hash(rawRefreshToken))
                .orElseThrow(TokenInvalidException::new);
        User user = stored.getUser();
        if (stored.isRevoked()) {
            revokeAllSessions(user);
            throw new TokenInvalidException();
        }
        if (stored.isExpiredAt(now) || !user.isActive()) {
            throw new TokenInvalidException();
        }
        stored.revoke();
        return issueTokens(user, now);
    }

    /** Revokes the given refresh token if it belongs to the caller. Unknown tokens are ignored (idempotent). */
    @Transactional
    public void logout(AuthenticatedUser caller, String rawRefreshToken) {
        refreshTokens.findByTokenHash(hash(rawRefreshToken))
                .filter(token -> token.getUser().getId().equals(caller.id()))
                .ifPresent(RefreshToken::revoke);
    }

    @Transactional(readOnly = true)
    public UserView currentUser(AuthenticatedUser caller) {
        return users.findById(caller.id())
                .map(UserView::of)
                .orElseThrow(() -> new UserNotFoundException(caller.id()));
    }

    // ------------------------------------------------------------------ helpers

    private AuthResult issueTokens(User user, Instant now) {
        IssuedAccessToken access = accessTokenIssuer.issue(user);
        String rawRefresh = newOpaqueToken();
        refreshTokens.save(new RefreshToken(user, hash(rawRefresh), now.plus(refreshTokenLifetime)));
        return new AuthResult(access.token(), access.expiresInSeconds(), rawRefresh, UserView.of(user));
    }

    private void revokeAllSessions(User user) {
        refreshTokens.findByUser_IdAndRevokedFalse(user.getId()).forEach(RefreshToken::revoke);
    }

    private String newOpaqueToken() {
        byte[] bytes = new byte[REFRESH_TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is always available in the JDK", ex);
        }
    }

    private static InputValidationException emailTaken() {
        return new InputValidationException("email", "is already registered");
    }
}
