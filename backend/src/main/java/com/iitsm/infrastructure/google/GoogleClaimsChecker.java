package com.iitsm.infrastructure.google;

import java.util.Set;

import com.iitsm.application.auth.GoogleIdTokenVerifier.GoogleIdentity;
import com.iitsm.application.auth.GoogleIdTokenVerifier.RejectedTokenException;

import io.jsonwebtoken.Claims;

/**
 * The claim rules every Google ID token must pass once its signature is good (DEC-04, DEC-100). Shared by the real
 * and the fake adapter, so the smoke test exercises exactly the checks production runs. Expiry is checked by JJWT
 * itself while parsing (with our Clock and a one-minute skew).
 */
final class GoogleClaimsChecker {

    /** Google issues tokens with either form of its issuer. */
    static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    private final String clientId;

    GoogleClaimsChecker(String clientId) {
        this.clientId = clientId;
    }

    GoogleIdentity check(Claims claims) {
        if (clientId.isBlank()) {
            throw new RejectedTokenException("GOOGLE_CLIENT_ID is not configured");
        }
        if (claims.getExpiration() == null) {
            throw new RejectedTokenException("token has no expiry");
        }
        if (!ISSUERS.contains(claims.getIssuer())) {
            throw new RejectedTokenException("wrong issuer " + shorten(claims.getIssuer()));
        }
        Set<String> audience = claims.getAudience();
        if (audience == null || !audience.contains(clientId)) {
            throw new RejectedTokenException("wrong audience " + shorten(String.valueOf(audience)));
        }
        String subject = claims.getSubject();
        String email = claims.get("email", String.class);
        if (subject == null || subject.isBlank() || subject.length() > 100) {
            throw new RejectedTokenException("missing or oversized subject");
        }
        if (email == null || email.isBlank() || email.length() > 150) {
            throw new RejectedTokenException("missing or oversized email");
        }
        return new GoogleIdentity(subject, email, isTrue(claims.get("email_verified")), claims.get("name", String.class));
    }

    /** Google sends a boolean; some older tokens carried the string "true". */
    private static boolean isTrue(Object value) {
        return Boolean.TRUE.equals(value) || "true".equals(value);
    }

    private static String shorten(String text) {
        if (text == null) {
            return "(none)";
        }
        return text.length() <= 80 ? text : text.substring(0, 80) + "...";
    }
}
