package com.iitsm.infrastructure.realtime;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;

/**
 * Keeps the open WebSocket sessions so one can be closed when its access token expires (decision DEC-42, DEC-82).
 * <p>
 * A Decorator around Spring's WebSocket handler records each session when it opens and forgets it when it closes. On
 * STOMP CONNECT, {@code WebSocketConfig} calls {@link #closeAtExpiry} with the token's expiry; a timer then closes
 * the socket with status {@value #TOKEN_EXPIRED_CODE} "TOKEN_EXPIRED". The client refreshes its token and connects
 * again (meanwhile it polls, API contract B.5). Every inbound frame after the expiry is refused as well, which also
 * covers the demo clock being moved forward (D1).
 */
@Component
public class WebSocketSessions implements WebSocketHandlerDecoratorFactory {

    /** Application close code (4000 to 4999 are free for applications, RFC 6455). */
    public static final int TOKEN_EXPIRED_CODE = 4001;
    public static final CloseStatus TOKEN_EXPIRED = new CloseStatus(TOKEN_EXPIRED_CODE, "TOKEN_EXPIRED");

    private static final Logger log = LoggerFactory.getLogger(WebSocketSessions.class);

    private final Map<String, WebSocketSession> open = new ConcurrentHashMap<>();
    private final Map<String, ScheduledFuture<?>> timers = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler;
    private final Clock clock;

    public WebSocketSessions(@Qualifier("socketExpiryScheduler") ScheduledExecutorService scheduler, Clock clock) {
        this.scheduler = scheduler;
        this.clock = clock;
    }

    @Override
    public WebSocketHandler decorate(WebSocketHandler handler) {
        return new WebSocketHandlerDecorator(handler) {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                open.put(session.getId(), session);
                super.afterConnectionEstablished(session);
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
                open.remove(session.getId());
                ScheduledFuture<?> timer = timers.remove(session.getId());
                if (timer != null) {
                    timer.cancel(false);
                }
                super.afterConnectionClosed(session, status);
            }
        };
    }

    /** Schedules the close of a session at the moment its token expires (at once if that moment has passed). */
    public void closeAtExpiry(String sessionId, Instant expiresAt) {
        long delayMillis = Math.max(0, Duration.between(clock.instant(), expiresAt).toMillis());
        ScheduledFuture<?> previous = timers.put(sessionId,
                scheduler.schedule(() -> closeExpired(sessionId), delayMillis, TimeUnit.MILLISECONDS));
        if (previous != null) {
            previous.cancel(false);
        }
    }

    /** Closes a session whose token has expired; nothing happens if it is already closed. */
    public void closeExpired(String sessionId) {
        timers.remove(sessionId);
        WebSocketSession session = open.get(sessionId);
        if (session == null || !session.isOpen()) {
            return;
        }
        try {
            session.close(TOKEN_EXPIRED);
            log.info("Closed WebSocket session {}: access token expired", sessionId);
        } catch (IOException | RuntimeException ex) {
            log.warn("Could not close expired WebSocket session {}: {}", sessionId, ex.toString());
        }
    }

    public int openCount() {
        return open.size();
    }
}
