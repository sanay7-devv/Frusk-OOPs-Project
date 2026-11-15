package com.iitsm.infrastructure.ai;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import com.iitsm.application.intelligence.EmbeddingClient;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Adapter to the Gemini embedding API over plain HTTP ({@code POST /v1beta/models/{model}:batchEmbedContents}), free
 * of charge on the free tier. One request carries a batch of texts and returns one vector each. The task type
 * SEMANTIC_SIMILARITY is sent for gemini-embedding-001 (gemini-embedding-2 takes no task type), the size is requested
 * with {@code outputDimensionality}, and every vector is L2-normalised here because the API only normalises the full
 * 3072 size. The key travels in the {@code x-goog-api-key} header, never in the URL, and is never logged; neither is
 * the text or the response body.
 */
class GeminiEmbeddingClient implements EmbeddingClient {

    private final EmbeddingProperties properties;
    private final String key;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    GeminiEmbeddingClient(EmbeddingProperties properties, String key, ObjectMapper mapper) {
        this.properties = properties;
        this.key = key;
        this.mapper = mapper;
    }

    @Override
    public boolean isAvailable() {
        return key != null && !key.isBlank();
    }

    @Override
    public String model() {
        return properties.model() + "@" + properties.dimensions();
    }

    @Override
    public List<double[]> embed(List<String> texts, Duration timeout) {
        if (!isAvailable()) {
            throw new EmbeddingException("no API key configured");
        }
        if (texts.isEmpty()) {
            return List.of();
        }
        boolean taskType = !properties.model().startsWith("gemini-embedding-2");
        ObjectNode body = mapper.createObjectNode();
        var requests = body.putArray("requests");
        for (String text : texts) {
            ObjectNode request = requests.addObject();
            request.put("model", "models/" + properties.model());
            request.putObject("content").putArray("parts").addObject().put("text", text);
            if (taskType) {
                request.put("taskType", "SEMANTIC_SIMILARITY");
            }
            request.put("outputDimensionality", properties.dimensions());
        }
        String model = URLEncoder.encode(properties.model(), StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create(properties.baseUrl() + "/v1beta/models/" + model + ":batchEmbedContents"))
                .timeout(timeout)
                .header("content-type", "application/json")
                .header("x-goog-api-key", key)
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();
        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new EmbeddingException("interrupted while waiting for the embedding model", ex);
        } catch (IOException ex) {
            throw new EmbeddingException("embedding request failed: " + ex.getClass().getSimpleName(), ex);
        }
        if (response.statusCode() == 429) {
            throw new EmbeddingException("embedding quota or rate limit reached (HTTP 429)", true, null);
        }
        if (response.statusCode() != 200) {
            throw new EmbeddingException("embedding model returned HTTP " + response.statusCode());
        }
        JsonNode embeddings = mapper.readTree(response.body()).path("embeddings");
        if (!embeddings.isArray() || embeddings.size() != texts.size()) {
            throw new EmbeddingException("embedding model returned an unexpected number of vectors");
        }
        List<double[]> vectors = new ArrayList<>();
        for (JsonNode embedding : embeddings) {
            JsonNode values = embedding.path("values");
            if (!values.isArray() || values.size() != properties.dimensions()) {
                throw new EmbeddingException("embedding model returned a vector of the wrong size");
            }
            double[] vector = new double[values.size()];
            double norm = 0;
            for (int i = 0; i < vector.length; i++) {
                vector[i] = values.get(i).asDouble();
                norm += vector[i] * vector[i];
            }
            norm = Math.sqrt(norm);
            if (norm == 0) {
                throw new EmbeddingException("embedding model returned an empty vector");
            }
            for (int i = 0; i < vector.length; i++) {
                vector[i] /= norm;
            }
            vectors.add(vector);
        }
        return vectors;
    }
}
