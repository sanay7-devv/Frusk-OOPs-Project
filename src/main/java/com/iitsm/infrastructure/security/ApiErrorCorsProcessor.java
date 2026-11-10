package com.iitsm.infrastructure.security;

import java.io.IOException;

import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.DefaultCorsProcessor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Spring's CORS checks, but a rejected request gets the standard error body (403 REQUEST_REJECTED) instead of
 * Spring's plain-text "Invalid CORS request", so every failure has the same shape (API contract B.1).
 */
public class ApiErrorCorsProcessor extends DefaultCorsProcessor {

    private final ApiErrorWriter errorWriter;

    public ApiErrorCorsProcessor(ApiErrorWriter errorWriter) {
        this.errorWriter = errorWriter;
    }

    @Override
    public boolean processRequest(CorsConfiguration config, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        boolean allowed = super.processRequest(config, request, response);
        if (!allowed) {
            errorWriter.write(request, response, 403, "REQUEST_REJECTED",
                    "Cross-origin request from this origin is not allowed.");
        }
        return allowed;
    }

    /** Left empty: the body is written in processRequest, where the request path is known. */
    @Override
    protected void rejectRequest(ServerHttpResponse response) {
    }
}
