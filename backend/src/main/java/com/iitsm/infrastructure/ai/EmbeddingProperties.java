package com.iitsm.infrastructure.ai;

import java.util.Locale;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Embedding settings (app.embedding.*). Provider "gemini" (default) or "none". The key comes from the environment
 * only: {@code EMBEDDING_API_KEY}, or, when the LLM provider is also Gemini, the LLM key (one free Google key does
 * both). The Anthropic key is never sent to Google. Model "gemini-embedding-001" and 768 dimensions by default
 * (3072 is the native size; 768 keeps storage and cosine cost small with little quality loss).
 */
@ConfigurationProperties(prefix = "app.embedding")
public record EmbeddingProperties(String provider, String apiKey, String model, Integer dimensions, String baseUrl) {

    public static final String GEMINI = "gemini";
    public static final String NONE = "none";

    public EmbeddingProperties {
        provider = blankTo(provider, GEMINI).toLowerCase(Locale.ROOT);
        model = blankTo(model, "gemini-embedding-001");
        dimensions = dimensions == null || dimensions < 128 || dimensions > 3072 ? 768 : dimensions;
        baseUrl = blankTo(baseUrl, "https://generativelanguage.googleapis.com");
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.strip();
    }
}
