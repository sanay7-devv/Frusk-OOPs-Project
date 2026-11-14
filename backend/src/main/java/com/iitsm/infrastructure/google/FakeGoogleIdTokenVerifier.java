package com.iitsm.infrastructure.google;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Date;

import javax.crypto.SecretKey;

import com.iitsm.application.auth.GoogleIdTokenVerifier;

import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Offline stand-in for Google (app.google.verifier=fake, DEC-101), for smoke runs and demos without internet.
 * Tokens are HS256-signed with the fixed {@link #SIGNING_KEY} instead of Google's RSA keys; everything after the
 * signature (expiry, issuer, audience, email_verified) goes through the same {@link GoogleClaimsChecker} as the real
 * adapter. {@link GoogleSignInConfig} refuses to start with it outside the dev, demo and test profiles.
 */
final class FakeGoogleIdTokenVerifier implements GoogleIdTokenVerifier {

    /** Public on purpose: smoke scripts sign their test tokens with it. Never accepted in production. */
    static final String SIGNING_KEY = "iitsm-fake-google-id-token-key-for-offline-smoke-runs";

    private final JwtParser parser;
    private final GoogleClaimsChecker checker;

    FakeGoogleIdTokenVerifier(GoogleProperties properties, Clock clock) {
        SecretKey key = Keys.hmacShaKeyFor(SIGNING_KEY.getBytes(StandardCharsets.UTF_8));
        this.parser = Jwts.parser()
                .verifyWith(key)
                .clock(() -> Date.from(clock.instant()))
                .clockSkewSeconds(JjwtGoogleIdTokenVerifier.CLOCK_SKEW_SECONDS)
                .build();
        this.checker = new GoogleClaimsChecker(properties.clientId());
    }

    @Override
    public GoogleIdentity verify(String idToken) {
        return checker.check(JjwtGoogleIdTokenVerifier.parse(parser, idToken));
    }
}
