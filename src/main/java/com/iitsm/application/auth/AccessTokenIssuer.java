package com.iitsm.application.auth;

import com.iitsm.domain.user.User;

/**
 * Port for creating access tokens. The application layer decides when a token is issued; the infrastructure
 * (JWT) decides what it looks like.
 */
public interface AccessTokenIssuer {

    IssuedAccessToken issue(User user);

    record IssuedAccessToken(String token, long expiresInSeconds) {
    }
}
