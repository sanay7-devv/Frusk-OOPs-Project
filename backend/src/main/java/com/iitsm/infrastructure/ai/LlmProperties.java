package com.iitsm.infrastructure.ai;

import java.util.Locale;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * LLM settings (app.llm.*). The API key comes from the environment only ({@code LLM_API_KEY}, or
 * {@code GEMINI_API_KEY}); with no key the LLM path is disabled and the keyword engine answers. {@code provider} is
 * "gemini" (the default, Google Gemini API), "anthropic" (Anthropic Messages API) or "fake" (a scripted client for
 * demos and smoke runs that never touches the network). Model and base URL default per provider when left empty.
 */
@ConfigurationProperties(prefix = "app.llm")
public record LlmProperties(String apiKey, String model, String baseUrl, String apiVersion, String provider) {

    public static final String GEMINI = "gemini";
    public static final String ANTHROPIC = "anthropic";
    public static final String FAKE = "fake";

    public LlmProperties {
        provider = blankTo(provider, GEMINI).toLowerCase(Locale.ROOT);
        boolean anthropic = ANTHROPIC.equals(provider);
        model = blankTo(model, anthropic ? "claude-haiku-5-5" : "gemini-3.5-flash-lite");
        baseUrl = blankTo(baseUrl, anthropic ? "https://api.anthropic.com" : "https://generativelanguage.googleapis.com");
        apiVersion = blankTo(apiVersion, "2026-10-21");
    }

    public boolean hasKey() {
        return apiKey != null && !apiKey.isBlank();
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.strip();
    }
}
