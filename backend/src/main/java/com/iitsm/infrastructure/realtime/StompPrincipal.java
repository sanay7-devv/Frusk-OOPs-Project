package com.iitsm.infrastructure.realtime;

import java.security.Principal;
import java.time.Instant;

import com.iitsm.application.auth.AuthenticatedUser;

/**
 * The person behind a STOMP session, read from the access token on CONNECT. The name is the user id, so
 * {@code convertAndSendToUser(id, ...)} reaches them (decision DEC-54); the permissions decide which destinations
 * they may subscribe to, and {@code expiresAt} when the session ends (decision DEC-42).
 */
public record StompPrincipal(AuthenticatedUser user, Instant expiresAt) implements Principal {

    @Override
    public String getName() {
        return String.valueOf(user.id());
    }

    public boolean expiredAt(Instant now) {
        return !now.isBefore(expiresAt);
    }
}
