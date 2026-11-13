package com.iitsm.infrastructure.notification;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.notification.ChannelType;
import com.iitsm.domain.notification.NotificationChannel;
import com.iitsm.domain.notification.NotificationMessage;

import tools.jackson.databind.json.JsonMapper;

/**
 * Adapter: one post to a chat room through an incoming webhook (Slack, Teams, Mattermost and Discord all accept a
 * JSON body with {@code text}; {@code content} is added for Discord). Used for the events a whole team should see
 * (see NotificationRules.chatApplies), once per event, not once per person.
 * <p>
 * The address is the live setting {@code notification.chat.webhook.url}. While it is empty the message is only
 * logged, so nothing needs the network (decision DEC-43 A6).
 */
@Component
public class ChatWebhookChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(ChatWebhookChannel.class);

    private final ConfigService config;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final JsonMapper json = JsonMapper.builder().build();

    public ChatWebhookChannel(ConfigService config) {
        this.config = config;
    }

    @Override
    public ChannelType type() {
        return ChannelType.CHAT;
    }

    @Override
    public Optional<Long> send(NotificationMessage message) throws Exception {
        String text = message.title() + " - " + message.message();
        String url = config.current().raw(ConfigKey.NOTIFICATION_CHAT_WEBHOOK_URL);
        if (url == null || url.isBlank()) {
            log.info("Chat message (no webhook set, only logged): {}", text);
            return Optional.empty();
        }
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(
                        json.writeValueAsString(Map.of("text", text, "content", text)), StandardCharsets.UTF_8))
                .build();
        HttpResponse<Void> response = http.send(request, HttpResponse.BodyHandlers.discarding());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("the chat webhook answered HTTP " + response.statusCode());
        }
        log.info("Chat message posted to the webhook: {}", text);
        return Optional.empty();
    }
}
