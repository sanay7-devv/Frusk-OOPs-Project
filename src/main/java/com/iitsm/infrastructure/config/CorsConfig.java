package com.iitsm.infrastructure.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import com.iitsm.infrastructure.security.ApiErrorCorsProcessor;
import com.iitsm.infrastructure.security.ApiErrorWriter;

/**
 * CORS for the REST API: only the frontend origin (app.cors.allowed-origin, env CORS_ORIGIN) is allowed.
 * Spring Security's http.cors(...) uses the bean named corsFilter, whose processor answers rejected requests in
 * the standard error format. Credentials stay off: tokens travel in the Authorization header, not in cookies.
 */
@Configuration
public class CorsConfig {

    @Bean
    CorsFilter corsFilter(CorsConfigurationSource corsConfigurationSource, ApiErrorWriter errorWriter) {
        CorsFilter filter = new CorsFilter(corsConfigurationSource);
        filter.setCorsProcessor(new ApiErrorCorsProcessor(errorWriter));
        return filter;
    }

    /** The filter runs inside the security chain only; stop Boot from also registering it as a servlet filter. */
    @Bean
    FilterRegistrationBean<CorsFilter> corsFilterRegistration(CorsFilter corsFilter) {
        FilterRegistrationBean<CorsFilter> registration = new FilterRegistrationBean<>(corsFilter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origin}") String allowedOrigin) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigin));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Request-Id"));
        config.setExposedHeaders(List.of("X-Request-Id"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
