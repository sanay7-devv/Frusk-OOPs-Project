package com.iitsm.web.filter;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.ratelimit.RateLimiter;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.RateLimitedException;
import com.iitsm.infrastructure.security.ApiErrorWriter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Rate limits at the door (handbook 2.5 M14, DEC-90). Runs inside the security chain, so the caller is known:
 * <ul>
 *   <li>{@code POST /auth/login}: per client address and e-mail, {@code ratelimit.login.per.minute}; the body is read
 *       (at most 4 KB) only to find the e-mail, then handed on unchanged;</li>
 *   <li>{@code POST /auth/google} (module M2b): per client address, same setting;</li>
 *   <li>{@code POST /incidents}: per user, {@code ratelimit.incident.create.per.minute} (handbook: 20).</li>
 * </ul>
 * A refused request gets the standard 429 RATE_LIMITED body and a {@code Retry-After} header. The filter sits in
 * front of the controllers, so neither {@code AuthService} nor {@code IncidentService} knows about it. The client
 * address is the socket address: behind a reverse proxy the proxy must pass the real one on (stated in DEC-90).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String API = "/api/v1";
    private static final int MAX_BODY = 4096;
    private static final Pattern EMAIL = Pattern.compile("\"email\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.){0,200})\"");

    private final RateLimiter limiter;
    private final ConfigService config;
    private final ApiErrorWriter errors;

    public RateLimitFilter(RateLimiter limiter, ConfigService config, ApiErrorWriter errors) {
        this.limiter = limiter;
        this.config = config;
        this.errors = errors;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        HttpServletRequest forwarded = request;
        try {
            if (HttpMethod.POST.matches(request.getMethod())) {
                String path = request.getRequestURI();
                if ((API + "/auth/login").equals(path)) {
                    byte[] body = request.getInputStream().readNBytes(MAX_BODY + 1);
                    if (body.length > MAX_BODY) {
                        errors.write(request, response, 400, "VALIDATION_FAILED", "The request body is too large.");
                        return;
                    }
                    forwarded = new CachedBodyRequest(request, body);
                    int perMinute = config.current().intValue(ConfigKey.RATELIMIT_LOGIN_PER_MINUTE);
                    // one address trying many e-mails is limited too (5 x the per-account limit)
                    limiter.check("LOGIN_ADDRESS", request.getRemoteAddr(), perMinute * 5);
                    limiter.check("LOGIN", request.getRemoteAddr() + "|" + emailIn(body), perMinute);
                } else if ((API + "/auth/password-reset/request").equals(path)) {
                    byte[] body = request.getInputStream().readNBytes(MAX_BODY + 1);
                    if (body.length > MAX_BODY) {
                        errors.write(request, response, 400, "VALIDATION_FAILED", "The request body is too large.");
                        return;
                    }
                    forwarded = new CachedBodyRequest(request, body);
                    int perMinute = config.current().intValue(ConfigKey.RATELIMIT_LOGIN_PER_MINUTE);
                    limiter.check("RESET_ADDRESS", request.getRemoteAddr(), perMinute * 5);
                    limiter.check("RESET", request.getRemoteAddr() + "|" + emailIn(body), perMinute);
                } else if ((API + "/auth/google").equals(path)) {
                    limiter.check("GOOGLE", request.getRemoteAddr(),
                            config.current().intValue(ConfigKey.RATELIMIT_LOGIN_PER_MINUTE));
                } else if ((API + "/incidents").equals(path)) {
                    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                    if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser caller) {
                        limiter.check("INCIDENT_CREATE", String.valueOf(caller.id()),
                                config.current().intValue(ConfigKey.RATELIMIT_INCIDENT_CREATE_PER_MINUTE));
                    }
                }
            }
        } catch (RateLimitedException ex) {
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()));
            errors.write(request, response, ex.getStatus(), ex.getCode(), ex.getMessage());
            return;
        }
        chain.doFilter(forwarded, response);
    }

    /** The e-mail of a login body, lower-case, or "" when it cannot be found (then the address alone is limited). */
    private static String emailIn(byte[] body) {
        Matcher m = EMAIL.matcher(new String(body, java.nio.charset.StandardCharsets.UTF_8));
        return m.find() ? m.group(1).strip().toLowerCase(Locale.ROOT) : "";
    }

    /** Replays the body that was read to find the e-mail. */
    private static final class CachedBodyRequest extends HttpServletRequestWrapper {

        private final byte[] bytes;

        CachedBodyRequest(HttpServletRequest request, byte[] bytes) {
            super(request);
            this.bytes = bytes;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream in = new ByteArrayInputStream(bytes);
            return new ServletInputStream() {
                @Override
                public int read() {
                    return in.read();
                }

                @Override
                public int read(byte[] b, int off, int len) {
                    return in.read(b, off, len);
                }

                @Override
                public boolean isFinished() {
                    return in.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener listener) {
                    throw new UnsupportedOperationException();
                }
            };
        }

        @Override
        public java.io.BufferedReader getReader() {
            return new java.io.BufferedReader(new java.io.InputStreamReader(getInputStream(),
                    java.nio.charset.StandardCharsets.UTF_8));
        }
    }
}
