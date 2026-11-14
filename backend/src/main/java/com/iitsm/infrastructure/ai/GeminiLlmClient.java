package com.iitsm.infrastructure.ai;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import com.iitsm.domain.intelligence.LlmClient;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Adapter to the Google Gemini API over plain HTTP ({@code POST /v1beta/models/{model}:generateContent}). Sends the
 * system prompt as {@code system_instruction} and the user message as the one turn of {@code contents}, asks for a
 * JSON answer ({@code responseMimeType: application/json}, our prompts all demand one JSON object) and returns the
 * text parts of the first candidate, skipping thought summaries.
 * <p>
 * The key travels in the {@code x-goog-api-key} header, never in the URL, so it cannot end up in an access log; like
 * {@link AnthropicLlmClient} it never logs or echoes the key or the response body. A blocked prompt, a candidate
 * stopped for safety or an empty answer is a failure, which the fallback service turns into the keyword answer.
 */
class GeminiLlmClient implements LlmClient {

    private static final int MAX_OUTPUT_TOKENS = 1024;

    private final LlmProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    GeminiLlmClient(LlmProperties properties, ObjectMapper mapper) {
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
        body.putObject("system_instruction").putArray("parts").addObject().put("text", systemPrompt);
        body.putArray("contents").addObject().put("role", "user").putArray("parts").addObject().put("text", userMessage);
        body.putObject("generationConfig")
                .put("responseMimeType", "application/json")
                .put("maxOutputTokens", MAX_OUTPUT_TOKENS);

        String model = URLEncoder.encode(properties.model(), StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create(properties.baseUrl() + "/v1beta/models/" + model + ":generateContent"))
                .timeout(timeout)
                .header("content-type", "application/json")
                .header("x-goog-api-key", properties.apiKey())
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
        if (!root.path("promptFeedback").path("blockReason").asText("").isEmpty()) {
            throw new LlmException("model blocked the prompt");
        }
        JsonNode candidate = root.path("candidates").path(0);
        String finish = candidate.path("finishReason").asText("");
        if (finish.equals("SAFETY") || finish.equals("RECITATION") || finish.equals("PROHIBITED_CONTENT")) {
            throw new LlmException("model stopped the answer (" + finish + ")");
        }
        StringBuilder text = new StringBuilder();
        for (JsonNode part : candidate.path("content").path("parts")) {
            if (!part.path("thought").asBoolean(false)) {
                text.append(part.path("text").asText(""));
            }
        }
        if (text.isEmpty()) {
            throw new LlmException("model returned no text");
        }
        return text.toString();
    }
}
