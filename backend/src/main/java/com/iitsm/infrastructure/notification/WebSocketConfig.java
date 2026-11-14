package com.iitsm.infrastructure.notification;

import java.time.Clock;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

import com.iitsm.domain.exception.ItsmException;
import com.iitsm.infrastructure.realtime.StompDestinationPolicy;
import com.iitsm.infrastructure.realtime.StompPrincipal;
import com.iitsm.infrastructure.realtime.WebSocketSessions;
import com.iitsm.infrastructure.security.JwtService;
import com.iitsm.infrastructure.security.JwtService.VerifiedAccessToken;

/**
 * The STOMP setup of the real-time layer (handbook 2.5 M13, decisions DEC-42, DEC-54, DEC-82): endpoint {@code /ws},
 * an in-memory broker (single instance, DEC-42), user destinations under {@code /user}.
 * <p>
 * Every inbound frame passes one interceptor:
 * <ul>
 *   <li>CONNECT needs {@code Authorization: Bearer <access token>}; the session is named after the user id (so the
 *       notification push reaches it) and is closed when the token expires ({@link WebSocketSessions}).</li>
 *   <li>SUBSCRIBE is checked per destination with {@link StompDestinationPolicy}: notifications for anyone logged in,
 *       {@code /topic/dashboard} for administrators ({@code REPORT_VIEW}).</li>
 *   <li>Any frame after the token expired is refused and the socket closed.</li>
 *   <li>Clients may not SEND.</li>
 * </ul>
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    static final String NOTIFICATIONS_DESTINATION = StompDestinationPolicy.NOTIFICATIONS;

    private final JwtService jwtService;
    private final WebSocketSessions sessions;
    private final Clock clock;
    private final String allowedOrigin;

    public WebSocketConfig(JwtService jwtService, WebSocketSessions sessions, Clock clock,
                           @Value("${app.cors.allowed-origin}") String allowedOrigin) {
        this.jwtService = jwtService;
        this.sessions = sessions;
        this.clock = clock;
        this.allowedOrigin = allowedOrigin;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(allowedOrigin);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue", "/topic");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.addDecoratorFactory(sessions);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() == null) {
                    return message;
                }
                StompCommand command = accessor.getCommand();
                if (command == StompCommand.CONNECT) {
                    StompPrincipal principal = authenticate(accessor.getFirstNativeHeader("Authorization"));
                    accessor.setUser(principal);
                    if (accessor.getSessionId() != null) {
                        sessions.closeAtExpiry(accessor.getSessionId(), principal.expiresAt());
                    }
                    return message;
                }
                if (command == StompCommand.DISCONNECT) {
                    return message;
                }
                StompPrincipal principal = accessor.getUser() instanceof StompPrincipal p ? p : null;
                if (principal == null) {
                    throw new MessagingException("Connect with an access token first");
                }
                if (principal.expiredAt(clock.instant())) {
                    if (accessor.getSessionId() != null) {
                        sessions.closeExpired(accessor.getSessionId());
                    }
                    throw new MessagingException("Access token rejected: TOKEN_EXPIRED");
                }
                if (command == StompCommand.SUBSCRIBE) {
                    Optional<String> refusal = StompDestinationPolicy.refusal(principal, accessor.getDestination());
                    if (refusal.isPresent()) {
                        throw new MessagingException(refusal.get());
                    }
                } else if (command == StompCommand.SEND) {
                    throw new MessagingException("Clients cannot send messages");
                }
                return message;
            }
        });
    }

    private StompPrincipal authenticate(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessagingException("Authorization: Bearer <access token> is required to connect");
        }
        try {
            VerifiedAccessToken token = jwtService.verify(header.substring("Bearer ".length()).strip());
            return new StompPrincipal(token.user(), token.expiresAt());
        } catch (ItsmException ex) {
            throw new MessagingException("Access token rejected: " + ex.getCode());
        }
    }
}
