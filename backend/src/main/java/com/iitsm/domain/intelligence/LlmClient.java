package com.iitsm.domain.intelligence;

import java.time.Duration;

/**
 * The small port to a language model (Adapter pattern): one system prompt and one user message in, the model's text
 * out. {@code AnthropicLlmClient} talks to the Anthropic Messages API; a scripted client stands in for it in
 * demos and smoke runs. Everything model-specific (URL, headers, JSON envelope) stays behind this interface.
 */
public interface LlmClient {

    /** False when no key is configured: the LLM path is then simply disabled. */
    boolean isAvailable();

    /**
     * @throws LlmException on any failure: no key, HTTP error, timeout, unreadable envelope
     */
    String complete(String systemPrompt, String userMessage, Duration timeout);

    /** Any failure to get text from the model; the fallback service turns it into the keyword answer. */
    class LlmException extends RuntimeException {

        public LlmException(String message) {
            super(message);
        }

        public LlmException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
