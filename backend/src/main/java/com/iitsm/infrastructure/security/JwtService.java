package com.iitsm.infrastructure.security;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import com.iitsm.application.auth.AccessTokenIssuer;
import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.domain.exception.TokenExpiredException;
import com.iitsm.domain.exception.TokenInvalidException;
import com.iitsm.domain.user.PermissionKey;
import com.iitsm.domain.user.RoleType;
import com.iitsm.domain.user.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Creates and checks HS256 access tokens. A token carries the user id (subject), email, roles and permissions,
 * so requests are authorized without a database lookup. Time comes from the injected Clock.
 */
@Component
public class JwtService implements AccessTokenIssuer {

    private static final int MIN_SECRET_BYTES = 32;
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_ROLES = "roles";
    private static final String CLAIM_PERMISSIONS = "permissions";

    private final SecretKey key;
    private final long accessTokenSeconds;
    private final Clock clock;
    private final JwtParser parser;

    public JwtService(JwtProperties properties, Clock clock) {
        byte[] secret = properties.secret() == null ? new byte[0] : properties.secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET must be at least " + MIN_SECRET_BYTES + " bytes long");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.accessTokenSeconds = properties.accessTokenMinutes() * 60L;
        this.clock = clock;
        this.parser = Jwts.parser()
                .verifyWith(key)
                .clock(() -> Date.from(clock.instant()))
                .build();
    }

    @Override
    public IssuedAccessToken issue(User user) {
        Instant now = clock.instant();
        String token = Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim(CLAIM_ROLES, user.getRoleTypes().stream().map(Enum::name).toList())
                .claim(CLAIM_PERMISSIONS, user.getPermissions().stream().map(Enum::name).toList())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessTokenSeconds)))
                .signWith(key)
                .compact();
        return new IssuedAccessToken(token, accessTokenSeconds);
    }

    /** A verified access token: the caller and the moment the token stops being valid. */
    public record VerifiedAccessToken(AuthenticatedUser user, Instant expiresAt) {
    }

    /** Verifies signature and expiry and rebuilds the caller. Throws TOKEN_EXPIRED or TOKEN_INVALID. */
    public AuthenticatedUser parse(String token) {
        return verify(token).user();
    }

    /**
     * Like {@link #parse} but also returns the expiry, for a long-lived connection that must end when its token does
     * (the WebSocket session, decision DEC-42).
     */
    public VerifiedAccessToken verify(String token) {
        try {
            Claims claims = parser.parseSignedClaims(token).getPayload();
            if (claims.getExpiration() == null) {
                throw new TokenInvalidException();
            }
            return new VerifiedAccessToken(new AuthenticatedUser(
                    Long.valueOf(claims.getSubject()),
                    claims.get(CLAIM_EMAIL, String.class),
                    toEnumSet(claims.get(CLAIM_ROLES, List.class), RoleType.class),
                    toEnumSet(claims.get(CLAIM_PERMISSIONS, List.class), PermissionKey.class)),
                    claims.getExpiration().toInstant());
        } catch (ExpiredJwtException ex) {
            throw new TokenExpiredException();
        } catch (JwtException | IllegalArgumentException | ClassCastException ex) {
            // bad signature, malformed token, missing or unknown claim values
            throw new TokenInvalidException();
        }
    }

    private static <E extends Enum<E>> Set<E> toEnumSet(List<?> names, Class<E> type) {
        if (names == null) {
            throw new TokenInvalidException();
        }
        EnumSet<E> result = EnumSet.noneOf(type);
        for (Object name : names) {
            result.add(Enum.valueOf(type, (String) name));
        }
        return result;
    }
}
