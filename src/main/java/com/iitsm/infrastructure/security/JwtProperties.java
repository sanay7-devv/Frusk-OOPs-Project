package com.iitsm.infrastructure.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** JWT settings (app.jwt.*). The secret comes from the environment only (JWT_SECRET). */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, int accessTokenMinutes, int refreshTokenDays) {
}
