package com.iitsm.application.intelligence;

import java.time.Duration;
import java.util.List;

/**
 * The port to a text-embedding model (Adapter pattern): texts in, one vector per text out. {@code GeminiEmbeddingClient}
 * talks to the Google Gemini API, {@code DisabledEmbeddingClient} stands in when there is no key. Vectors are
 * L2-normalised and all have the same length. Everything provider-specific stays behind this interface.
 */
public interface EmbeddingClient {

    /** False when no key is configured: embeddings are then simply off and TF-IDF answers. */
    boolean isAvailable();

    /** Identifies the model and size of the vectors, stored with each vector; a change makes old vectors stale. */
    String model();

    /**
     * One vector per text, in order.
     *
     * @throws EmbeddingException on any failure
     */
    List<double[]> embed(List<String> texts, Duration timeout);

    class EmbeddingException extends RuntimeException {

        private final boolean rateLimited;

        public EmbeddingException(String message) {
            this(message, false, null);
        }

        public EmbeddingException(String message, Throwable cause) {
            this(message, false, cause);
        }

        public EmbeddingException(String message, boolean rateLimited, Throwable cause) {
            super(message, cause);
            this.rateLimited = rateLimited;
        }

        /** HTTP 429 or a quota error: the caller should stop for a while instead of retrying. */
        public boolean rateLimited() {
            return rateLimited;
        }
    }
}
