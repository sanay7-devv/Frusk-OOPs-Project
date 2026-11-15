package com.iitsm.web.filter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Guards {@code /actuator/prometheus} (A8, decision DEC-115). The path is permitted in {@code SecurityConfig} because a
 * Prometheus server cannot log in, so this filter is the lock: the endpoint answers only to
 * {@code Authorization: Bearer <app.metrics.token>}. With no token configured it does not exist (404), so a default
 * install exposes nothing. The comparison takes the same time whatever the guess.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class MetricsTokenFilter extends OncePerRequestFilter {

    static final String PATH = "/actuator/prometheus";
    private static final int MINIMUM_TOKEN_LENGTH = 16;

    private final byte[] token;

    public MetricsTokenFilter(@Value("${app.metrics.token:}") String token) {
        String configured = token == null ? "" : token.strip();
        this.token = configured.length() >= MINIMUM_TOKEN_LENGTH ? configured.getBytes(StandardCharsets.UTF_8) : null;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !PATH.equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (token == null) {
            response.sendError(HttpStatus.NOT_FOUND.value());
            return;
        }
        String header = request.getHeader("Authorization");
        byte[] given = header != null && header.startsWith("Bearer ")
                ? header.substring(7).strip().getBytes(StandardCharsets.UTF_8) : new byte[0];
        if (!MessageDigest.isEqual(token, given)) {
            response.setHeader("WWW-Authenticate", "Bearer");
            response.sendError(HttpStatus.UNAUTHORIZED.value());
            return;
        }
        chain.doFilter(request, response);
    }
}
