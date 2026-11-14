package com.iitsm.infrastructure.google;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Google sign-in settings (app.google.*, module M2b). {@code clientId} is the OAuth client id from the Google Cloud
 * console (env GOOGLE_CLIENT_ID); a token is accepted only when its audience equals it. {@code verifier} is
 * "google" (the real adapter) or "fake" (offline, dev/demo/test profiles only, DEC-101).
 */
@ConfigurationProperties(prefix = "app.google")
public record GoogleProperties(String clientId, String verifier, String jwksUri) {

    public static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";

    public GoogleProperties {
        clientId = clientId == null ? "" : clientId.strip();
        verifier = verifier == null || verifier.isBlank() ? "google" : verifier.strip();
        jwksUri = jwksUri == null || jwksUri.isBlank() ? GOOGLE_JWKS_URI : jwksUri.strip();
    }

    public boolean fake() {
        return "fake".equalsIgnoreCase(verifier);
    }
}
