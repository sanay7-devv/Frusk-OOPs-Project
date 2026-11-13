package com.iitsm.infrastructure.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * LLM settings (app.llm.*). The API key comes from the environment only (LLM_API_KEY); with no key the LLM path is
 * disabled and the keyword engine answers. {@code provider} is "anthropic" (the real API) or "fake" (a scripted
 * client for demos and smoke runs that never touches the network).
 */
@ConfigurationProperties(prefix = "app.llm")
public record LlmProperties(String apiKey, String model, String baseUrl, String apiVersion, String provider) {

    public LlmProperties {
        model = blankTo(model, "claude-haiku-5-5");
        baseUrl = blankTo(baseUrl, "https://api.anthropic.com");
        apiVersion = blankTo(apiVersion, "2026-10-21");
        provider = blankTo(provider, "anthropic");
    }

    public boolean hasKey() {
        return apiKey != null && !apiKey.isBlank();
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.strip();
    }
}
