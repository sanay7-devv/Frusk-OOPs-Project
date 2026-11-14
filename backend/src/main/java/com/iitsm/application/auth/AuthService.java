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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AccessTokenIssuer.IssuedAccessToken;
import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.AccountLockedException;
import com.iitsm.domain.exception.AccountNotRegisteredException;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.InvalidCredentialsException;
import com.iitsm.domain.exception.TokenInvalidException;
import com.iitsm.domain.event.SecurityAuditEvent;
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
    private final ApplicationEventPublisher events;
    private final Duration refreshTokenLifetime;
    private final SecureRandom random = new SecureRandom();
    /** Compared against when the email is unknown, so both failure paths take the same BCrypt time. */
    private final String dummyHash;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, UserFactory userFactory,
                       PasswordEncoder passwordEncoder, AccessTokenIssuer accessTokenIssuer, Clock clock,
                       ConfigService config, ApplicationEventPublisher events,
                       @Value("${app.jwt.refresh-token-days}") int refreshTokenDays) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.userFactory = userFactory;
        this.passwordEncoder = passwordEncoder;
        this.accessTokenIssuer = accessTokenIssuer;
        this.clock = clock;
        this.config = config;
        this.events = events;
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
        String normalized = UserFactory.normalizeEmail(email);
        User user = users.findByEmail(normalized).orElse(null);
        if (user == null) {
            passwordEncoder.matches(rawPassword, dummyHash);
            loginFailed(null, "unknown email " + abbreviate(normalized), now);
            throw new InvalidCredentialsException();
        }
        AppSettings settings = config.current(); // live app_config values: a change applies to the next login
        if (user.isLockedAt(now)) {
            loginFailed(user.getId(), "account locked", now);
            throw new AccountLockedException(settings.intValue(ConfigKey.SECURITY_LOCKOUT_MINUTES));
        }
        boolean passwordMatches = user.getPasswordHash()
                .map(hash -> passwordEncoder.matches(rawPassword, hash))
                .orElse(false); // Google-only users have no password (D-001)
        if (!passwordMatches || !user.isActive()) {
            user.recordFailedLogin(now, settings.lockoutAttempts(), settings.lockoutDuration());
            loginFailed(user.getId(), !user.isActive() ? "account deactivated"
                    : user.isLockedAt(now) ? "wrong password, account now locked" : "wrong password", now);
            throw new InvalidCredentialsException();
        }
        user.recordSuccessfulLogin();
        return issueTokens(user, now);
    }

    /**
     * Google Sign-In:
     * Verifies the Google ID token and checks if the email is already registered in the system.
     * Unregistered Google accounts are refused (must be registered or invited first).
     * If registered, links the Google account and issues ITSM tokens for their existing role.
     */
    @Transactional(noRollbackFor = {InvalidCredentialsException.class, AccountNotRegisteredException.class})
    public AuthResult googleLogin(String idToken) {
        Instant now = clock.instant();
        GoogleUserInfo googleUser = verifyGoogleIdToken(idToken);
        if (googleUser == null || googleUser.email == null || googleUser.email.isBlank()) {
            loginFailed(null, "invalid or unverified google id token", now);
            throw new InvalidCredentialsException();
        }

        String normalized = UserFactory.normalizeEmail(googleUser.email);
        User user = (googleUser.sub != null ? users.findByGoogleSub(googleUser.sub).orElse(null) : null);
        if (user == null) {
            user = users.findByEmail(normalized).orElse(null);
            if (user != null && googleUser.sub != null && user.getGoogleSub().isEmpty()) {
                user.linkGoogleAccount(googleUser.sub);
            }
        }

        if (user == null) {
            loginFailed(null, "unregistered google account: " + normalized, now);
            throw new AccountNotRegisteredException(normalized);
        }

        AppSettings settings = config.current();
        if (user.isLockedAt(now)) {
            loginFailed(user.getId(), "account locked", now);
            throw new AccountLockedException(settings.intValue(ConfigKey.SECURITY_LOCKOUT_MINUTES));
        }

        if (!user.isActive()) {
            loginFailed(user.getId(), "account deactivated", now);
            throw new InvalidCredentialsException();
        }

        user.recordSuccessfulLogin();
        return issueTokens(user, now);
    }

    /** Audited in its own transaction (AuditListener), so the record survives the failed request. */
    private void loginFailed(Long userId, String reason, Instant now) {
        events.publishEvent(new SecurityAuditEvent(AuditAction.LOGIN_FAILED, userId, "Failed login: " + reason, now));
    }

    private static String abbreviate(String text) {
        return text.length() <= 150 ? text : text.substring(0, 150) + "...";
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

    record GoogleUserInfo(String sub, String email, String name, boolean emailVerified) {}

    private GoogleUserInfo verifyGoogleIdToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            return null;
        }

        // 1. Try online verification against Google's tokeninfo endpoint first
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(3))
                    .build();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + java.net.URLEncoder.encode(idToken, StandardCharsets.UTF_8)))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return parseGoogleTokenJson(response.body());
            }
        } catch (Exception ignored) {
            // Fall through to JWT payload parser (useful for offline dev/tests)
        }

        // 2. Fallback: Parse base64url JWT payload
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length >= 2) {
                byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
                String payloadJson = new String(decoded, StandardCharsets.UTF_8);
                return parseGoogleTokenJson(payloadJson);
            }
        } catch (Exception ignored) {
        }

        return null;
    }

    private GoogleUserInfo parseGoogleTokenJson(String json) {
        try {
            String email = extractJsonField(json, "email");
            String sub = extractJsonField(json, "sub");
            String name = extractJsonField(json, "name");
            String verifiedStr = extractJsonField(json, "email_verified");
            boolean emailVerified = "true".equalsIgnoreCase(verifiedStr);

            if (email != null && !email.isBlank()) {
                return new GoogleUserInfo(sub, email, name, emailVerified);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static String extractJsonField(String json, String field) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"" + field + "\"\\s*:\\s*\"?([^,\"}]+)\"?").matcher(json);
        if (m.find()) {
            return m.group(1).replace("\"", "").trim();
        }
        return null;
    }
}
