package com.iitsm.infrastructure.ai;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import com.iitsm.domain.intelligence.LlmClient;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Adapter to the Anthropic Messages API over plain HTTP (POST /v1/messages). Sends one system prompt and one user
 * message, asks for low effort (a short classification should not think for long), and returns the text blocks of
 * the answer. It sends no sampling parameters (newer models reject them) and never logs or echoes the key or the
 * response body, so a provider error cannot leak either into logs or into an API response.
 */
class AnthropicLlmClient implements LlmClient {

    private static final int MAX_TOKENS = 1024;

    private final LlmProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    AnthropicLlmClient(LlmProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
    }

    @Override
    public boolean isAvailable() {
        return properties.hasKey();
    }

    @Override
    public String complete(String systemPrompt, String userMessage, Duration timeout) {
        if (!isAvailable()) {
            throw new LlmException("no API key configured");
        }
        ObjectNode body = mapper.createObjectNode();
        body.put("model", properties.model());
        body.put("max_tokens", MAX_TOKENS);
        body.put("system", systemPrompt);
        ArrayNode messages = body.putArray("messages");
        messages.addObject().put("role", "user").put("content", userMessage);
        body.putObject("output_config").put("effort", "low");

        HttpRequest request = HttpRequest.newBuilder(URI.create(properties.baseUrl() + "/v1/messages"))
                .timeout(timeout)
                .header("content-type", "application/json")
                .header("x-api-key", properties.apiKey())
                .header("anthropic-version", properties.apiVersion())
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();
        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new LlmException("interrupted while waiting for the model", ex);
        } catch (IOException ex) {
            throw new LlmException("model request failed: " + ex.getClass().getSimpleName(), ex);
        }
        if (response.statusCode() != 200) {
            throw new LlmException("model returned HTTP " + response.statusCode());
        }
        JsonNode root = mapper.readTree(response.body());
        if ("refusal".equals(root.path("stop_reason").asText())) {
            throw new LlmException("model declined the request");
        }
        StringBuilder text = new StringBuilder();
        for (JsonNode block : root.path("content")) {
            if ("text".equals(block.path("type").asText())) {
                text.append(block.path("text").asText());
            }
        }
        if (text.isEmpty()) {
            throw new LlmException("model returned no text");
        }
        return text.toString();
    }
}
