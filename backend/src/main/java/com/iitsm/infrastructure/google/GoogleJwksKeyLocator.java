package com.iitsm.infrastructure.google;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.Key;
import java.security.PublicKey;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.iitsm.application.auth.GoogleIdTokenVerifier.RejectedTokenException;
import com.iitsm.domain.exception.GoogleSignInUnavailableException;

import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.LocatorAdapter;
import io.jsonwebtoken.security.Jwk;
import io.jsonwebtoken.security.JwkSet;
import io.jsonwebtoken.security.Jwks;

/**
 * Finds the public key that signed a Google ID token (DEC-100). Google publishes its current RSA keys as a JWK set
 * and rotates them every few days; each token names its key in the {@code kid} header.
 * <p>
 * The set is cached for as long as Google's {@code Cache-Control: max-age} allows. An unknown {@code kid} triggers
 * one early refetch (Google may just have rotated), at most once a minute so forged kids cannot make us hammer
 * Google. If the keys cannot be fetched at all, sign-in answers 503 rather than accepting anything.
 */
final class GoogleJwksKeyLocator extends LocatorAdapter<Key> {

    private static final Logger log = LoggerFactory.getLogger(GoogleJwksKeyLocator.class);
    private static final Pattern MAX_AGE = Pattern.compile("max-age=(\\d+)");
    private static final Duration DEFAULT_TTL = Duration.ofHours(1);
    private static final Duration MIN_REFETCH_GAP = Duration.ofMinutes(1);
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final URI jwksUri;
    private final Clock clock;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();

    private volatile Map<String, PublicKey> keys = Map.of();
    private volatile Instant expiresAt = Instant.MIN;
    private volatile Instant fetchedAt = Instant.MIN;

    GoogleJwksKeyLocator(String jwksUri, Clock clock) {
        this.jwksUri = URI.create(jwksUri);
        this.clock = clock;
    }

    @Override
    protected Key locate(JwsHeader header) {
        if (!"RS256".equals(header.getAlgorithm())) {
            throw new RejectedTokenException("unexpected algorithm " + header.getAlgorithm());
        }
        String kid = header.getKeyId();
        if (kid == null) {
            throw new RejectedTokenException("token names no signing key");
        }
        Instant now = clock.instant();
        if (now.isAfter(expiresAt)) {
            refresh(now);
        }
        PublicKey key = keys.get(kid);
        if (key == null && now.isAfter(fetchedAt.plus(MIN_REFETCH_GAP))) {
            refresh(now); // Google may have rotated its keys since our last fetch
            key = keys.get(kid);
        }
        if (key == null) {
            throw new RejectedTokenException("unknown signing key " + kid);
        }
        return key;
    }

    private synchronized void refresh(Instant now) {
        if (now.isBefore(fetchedAt.plus(MIN_REFETCH_GAP))) {
            return; // another thread just refreshed
        }
        try {
            HttpResponse<String> response = http.send(
                    HttpRequest.newBuilder(jwksUri).timeout(TIMEOUT).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IOException("HTTP " + response.statusCode());
            }
            JwkSet set = Jwks.setParser().build().parse(response.body());
            Map<String, PublicKey> fresh = new HashMap<>();
            for (Jwk<?> jwk : set.getKeys()) {
                if (jwk.getId() != null && jwk.toKey() instanceof PublicKey publicKey) {
                    fresh.put(jwk.getId(), publicKey);
                }
            }
            keys = Map.copyOf(fresh);
            fetchedAt = now;
            expiresAt = now.plus(ttl(response.headers().firstValue("Cache-Control").orElse("")));
            log.info("Fetched {} Google signing keys, cached until {}", fresh.size(), expiresAt);
        } catch (IOException | RuntimeException ex) {
            log.warn("Could not fetch Google signing keys from {}: {}", jwksUri, ex.toString());
            fetchedAt = now; // do not retry on every request while Google is unreachable
            if (keys.isEmpty() || now.isAfter(expiresAt.plus(DEFAULT_TTL))) {
                throw new GoogleSignInUnavailableException();
            }
            // otherwise keep the cached keys a little longer: Google keys stay valid well past max-age
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new GoogleSignInUnavailableException();
        }
    }

    private static Duration ttl(String cacheControl) {
        Matcher m = MAX_AGE.matcher(cacheControl);
        return m.find() ? Duration.ofSeconds(Long.parseLong(m.group(1))) : DEFAULT_TTL;
    }
}
