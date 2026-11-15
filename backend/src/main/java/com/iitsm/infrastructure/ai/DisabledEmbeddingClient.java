package com.iitsm.infrastructure.ai;

import java.time.Duration;
import java.util.List;

import com.iitsm.application.intelligence.EmbeddingClient;

/** Null object used when there is no key (or provider "none"): similarity stays on TF-IDF and nothing is called. */
class DisabledEmbeddingClient implements EmbeddingClient {

    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public String model() {
        return "disabled";
    }

    @Override
    public List<double[]> embed(List<String> texts, Duration timeout) {
        throw new EmbeddingException("embeddings are disabled (no key)");
    }
}
