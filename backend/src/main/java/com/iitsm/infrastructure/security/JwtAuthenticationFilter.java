package com.iitsm.infrastructure.security;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.domain.exception.ItsmException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Reads "Authorization: Bearer ..." and, if the token is valid, marks the request as authenticated. Authorities
 * are the permission keys (method security checks those, never role names) plus ROLE_* for convenience.
 * <p>
 * A bad or expired token does not end the request here: public endpoints such as refresh must still work with a
 * stale header. The failure is remembered in a request attribute, and the entry point in {@link SecurityConfig}
 * reports TOKEN_EXPIRED or TOKEN_INVALID only if the endpoint actually needs a login.
 * Not a Spring bean on purpose, so it is not also registered as a plain servlet filter.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String TOKEN_FAILURE_ATTRIBUTE = JwtAuthenticationFilter.class.getName() + ".failure";

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            try {
                AuthenticatedUser user = jwtService.parse(header.substring(BEARER_PREFIX.length()).strip());
                UsernamePasswordAuthenticationToken authentication =
                        UsernamePasswordAuthenticationToken.authenticated(user, null, authoritiesOf(user));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (ItsmException ex) {
                SecurityContextHolder.clearContext();
                request.setAttribute(TOKEN_FAILURE_ATTRIBUTE, ex);
            }
        }
        chain.doFilter(request, response);
    }

    private static List<GrantedAuthority> authoritiesOf(AuthenticatedUser user) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        user.permissions().forEach(p -> authorities.add(new SimpleGrantedAuthority(p.name())));
        user.roles().forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r.name())));
        return authorities;
    }
}
