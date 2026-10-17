package com.iitsm.infrastructure.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;

/**
 * Baseline security for module M1: stateless API, CORS (see CorsConfig), security headers, and 401/403 answers
 * in the standard error format. Everything except health, API docs and the auth endpoints needs a login.
 * <p>
 * M2 extends this class: add the JWT authentication filter before UsernamePasswordAuthenticationFilter and
 * switch on method security. The public path list below is the only thing M2 should have to touch for routes.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_PATHS = {
            "/actuator/health", "/actuator/info",
            "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html",
            "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh"
    };

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ApiErrorWriter errorWriter) throws Exception {
        AuthenticationEntryPoint entryPoint = (request, response, ex) ->
                errorWriter.write(request, response, 401, "TOKEN_INVALID", "Authentication required. Log in again.");
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
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(entryPoint)
                        .accessDeniedHandler(deniedHandler))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);
        return http.build();
    }
}
