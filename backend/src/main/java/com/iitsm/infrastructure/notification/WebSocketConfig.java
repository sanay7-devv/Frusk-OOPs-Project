package com.iitsm.infrastructure.notification;

import java.util.List;

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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.domain.exception.ItsmException;
import com.iitsm.infrastructure.security.JwtService;

/**
 * The smallest STOMP setup that lets the notification push work (decision DEC-54): endpoint {@code /ws}, an in-memory
 * broker (single instance, DEC-42), user destinations under {@code /user}.
 * <p>
 * Module M13 owns the real-time layer and will extend this class (dashboard topic, per-destination permissions,
 * closing the session when the token expires). What is here already, because a push nobody can receive proves nothing:
 * the access token is checked on CONNECT (header {@code Authorization: Bearer ...}), the session is named after the
 * user id, and the only destination a client may subscribe to is {@code /user/queue/notifications}. Clients may not
 * send messages at all yet.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    static final String NOTIFICATIONS_DESTINATION = "/user/queue/notifications";

    private final JwtService jwtService;
    private final String allowedOrigin;

    public WebSocketConfig(JwtService jwtService, @Value("${app.cors.allowed-origin}") String allowedOrigin) {
        this.jwtService = jwtService;
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
                    accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
                } else if (command == StompCommand.SUBSCRIBE
                        && (accessor.getUser() == null || !NOTIFICATIONS_DESTINATION.equals(accessor.getDestination()))) {
                    throw new MessagingException("Subscribe to " + NOTIFICATIONS_DESTINATION + " after connecting");
                } else if (command == StompCommand.SEND) {
                    throw new MessagingException("Clients cannot send messages");
                }
                return message;
            }
        });
    }

    private UsernamePasswordAuthenticationToken authenticate(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessagingException("Authorization: Bearer <access token> is required to connect");
        }
        try {
            AuthenticatedUser user = jwtService.parse(header.substring("Bearer ".length()).strip());
            return UsernamePasswordAuthenticationToken.authenticated(String.valueOf(user.id()), null, List.of());
        } catch (ItsmException ex) {
            throw new MessagingException("Access token rejected: " + ex.getCode());
        }
    }
}
