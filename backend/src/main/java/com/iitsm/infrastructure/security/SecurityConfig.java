package com.iitsm.infrastructure.security;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;

import com.iitsm.domain.exception.ItsmException;

/**
 * Security for the stateless REST API: CORS (see CorsConfig), security headers, the JWT filter, method security on
 * permission keys, and 401/403 answers in the standard error format. Everything except health, API docs and the
 * public auth endpoints needs a login.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

    private static final String[] PUBLIC_PATHS = {
            "/actuator/health", "/actuator/info",
            "/v3/api-docs", "/v3/api-docs/**", "/v3/api-docs.yaml", "/swagger-ui/**", "/swagger-ui.html",
            "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh",
            // WebSocket handshake: a browser cannot send headers on it; the access token is checked on the STOMP CONNECT
            "/ws", "/ws/**"
    };

    /** BCrypt with the default cost 10, matching the seed data hashes (Testing handbook A.3). */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ApiErrorWriter errorWriter, JwtService jwtService)
            throws Exception {
        // If the JWT filter saw a bad or expired token, report that exact reason; otherwise no token was sent.
        AuthenticationEntryPoint entryPoint = (request, response, ex) -> {
            Object failure = request.getAttribute(JwtAuthenticationFilter.TOKEN_FAILURE_ATTRIBUTE);
            if (failure instanceof ItsmException tokenError) {
                errorWriter.write(request, response, tokenError.getStatus(), tokenError.getCode(),
                        tokenError.getMessage());
            } else {
                errorWriter.write(request, response, 401, "TOKEN_INVALID", "Authentication required. Log in again.");
            }
        };
        AccessDeniedHandler deniedHandler = (request, response, ex) ->
                errorWriter.write(request, response, 403, "UNAUTHORIZED_OPERATION",
                        "Your role or permissions do not allow this action.");

        http
                .csrf(AbstractHttpConfigurer::disable) // stateless API, tokens in the Authorization header
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.NO_REFERRER)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(new JwtAuthenticationFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(entryPoint)
                        .accessDeniedHandler(deniedHandler))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);
        return http.build();
    }
}
