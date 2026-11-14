package com.iitsm.infrastructure.google;

import java.time.Clock;
import java.util.Date;

import com.iitsm.application.auth.GoogleIdTokenVerifier;
import com.iitsm.application.auth.GoogleIdTokenVerifier.RejectedTokenException;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;

/**
 * The real adapter (DEC-100): JJWT checks the RS256 signature with the key {@link GoogleJwksKeyLocator} fetched from
 * Google, and the expiry; {@link GoogleClaimsChecker} checks issuer, audience and the identity claims.
 */
final class JjwtGoogleIdTokenVerifier implements GoogleIdTokenVerifier {

    /** Tolerated difference between Google's clock and ours. */
    static final long CLOCK_SKEW_SECONDS = 60;

    private final JwtParser parser;
    private final GoogleClaimsChecker checker;

    JjwtGoogleIdTokenVerifier(GoogleProperties properties, Clock clock) {
        this.parser = Jwts.parser()
                .keyLocator(new GoogleJwksKeyLocator(properties.jwksUri(), clock))
                .clock(() -> Date.from(clock.instant()))
                .clockSkewSeconds(CLOCK_SKEW_SECONDS)
                .build();
        this.checker = new GoogleClaimsChecker(properties.clientId());
    }

    @Override
    public GoogleIdentity verify(String idToken) {
        return checker.check(parse(parser, idToken));
    }

    /** Shared with the fake: JJWT failures become a rejected token with a short reason for the audit trail. */
    static Claims parse(JwtParser parser, String idToken) {
        try {
            return parser.parseSignedClaims(idToken).getPayload();
        } catch (ExpiredJwtException ex) {
            throw new RejectedTokenException("token expired");
        } catch (JwtException | IllegalArgumentException ex) {
            throw new RejectedTokenException(
                    "bad signature or malformed token (" + ex.getClass().getSimpleName() + ")");
        }
    }
}
