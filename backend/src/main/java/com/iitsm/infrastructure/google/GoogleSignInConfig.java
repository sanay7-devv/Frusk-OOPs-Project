package com.iitsm.infrastructure.google;

import java.time.Clock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

import com.iitsm.application.auth.GoogleIdTokenVerifier;

/**
 * Chooses the {@link GoogleIdTokenVerifier} adapter (M2b, DEC-101): the real one against Google's keys, or the
 * offline fake when {@code app.google.verifier=fake}. The fake would let anyone mint a token, so the application
 * refuses to start with it unless the dev, demo or test profile is active.
 */
@Configuration
@EnableConfigurationProperties(GoogleProperties.class)
public class GoogleSignInConfig {

    private static final Logger log = LoggerFactory.getLogger(GoogleSignInConfig.class);

    @Bean
    GoogleIdTokenVerifier googleIdTokenVerifier(GoogleProperties properties, Clock clock, Environment environment) {
        if (properties.clientId().isBlank()) {
            log.warn("GOOGLE_CLIENT_ID is not set: every Google sign-in will be refused");
        }
        if (properties.fake()) {
            if (!environment.acceptsProfiles(Profiles.of("dev", "demo", "test"))) {
                throw new IllegalStateException(
                        "app.google.verifier=fake is only allowed with the dev, demo or test profile");
            }
            log.warn("Google sign-in uses the FAKE verifier (offline test tokens are accepted)");
            return new FakeGoogleIdTokenVerifier(properties, clock);
        }
        return new JjwtGoogleIdTokenVerifier(properties, clock);
    }
}
