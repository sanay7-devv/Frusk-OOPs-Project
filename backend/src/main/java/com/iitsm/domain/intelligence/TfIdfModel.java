package com.iitsm.domain.intelligence;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * TF-IDF cosine similarity, the default similarity engine (DEC-42). A word counts more the rarer it is across
 * recent incidents (inverse document frequency, taken from the corpus), and more the more often it appears in the
 * text (term frequency, dampened by a logarithm). Titles count double, because a title is what the reporter
 * considered the heart of the problem. Two texts are then compared by the cosine of their weight vectors:
 * 1.0 identical wording, 0.0 no word in common.
 * <p>
 * Pure and deterministic: no storage, no clock, no randomness.
 */
public final class TfIdfModel {

    private static final int TITLE_BOOST = 2;

    /** A text as word weights, with its precomputed length. */
    public record Vector(Map<String, Double> weights, double norm) {

        public boolean isEmpty() {
            return weights.isEmpty();
        }
    }

    private final Map<String, Integer> documentFrequency;
    private final int documents;

    private TfIdfModel(Map<String, Integer> documentFrequency, int documents) {
        this.documentFrequency = documentFrequency;
        this.documents = documents;
    }

    /** Learns word rarity from the given texts (each text is one document). An empty corpus is allowed. */
    public static TfIdfModel fromCorpus(Collection<String> texts) {
        Map<String, Integer> df = new HashMap<>();
        for (String text : texts) {
            Set<String> distinct = new HashSet<>(Tokenizer.tokens(text));
            distinct.forEach(token -> df.merge(token, 1, Integer::sum));
        }
        return new TfIdfModel(df, texts.size());
    }

    public Vector vectorize(String title, String body) {
        Map<String, Integer> counts = new HashMap<>();
        Tokenizer.tokens(title).forEach(token -> counts.merge(token, TITLE_BOOST, Integer::sum));
        Tokenizer.tokens(body).forEach(token -> counts.merge(token, 1, Integer::sum));
        Map<String, Double> weights = new HashMap<>();
        double squares = 0;
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            double weight = (1 + Math.log(entry.getValue())) * idf(entry.getKey());
            weights.put(entry.getKey(), weight);
            squares += weight * weight;
        }
        return new Vector(weights, Math.sqrt(squares));
    }

    /** Smoothed IDF: never zero or negative, and a word never seen before is the rarest of all. */
    double idf(String token) {
        int df = documentFrequency.getOrDefault(token, 0);
        return Math.log((documents + 1.0) / (df + 1.0)) + 1.0;
    }

    /** Cosine of two vectors from 0 (nothing in common) to 1 (same wording); 0 if either is empty. */
    public static double cosine(Vector a, Vector b) {
        if (a.isEmpty() || b.isEmpty() || a.norm() == 0 || b.norm() == 0) {
            return 0;
        }
        Map<String, Double> small = a.weights().size() <= b.weights().size() ? a.weights() : b.weights();
        Map<String, Double> large = small == a.weights() ? b.weights() : a.weights();
        double dot = 0;
        for (Map.Entry<String, Double> entry : small.entrySet()) {
            Double other = large.get(entry.getKey());
            if (other != null) {
                dot += entry.getValue() * other;
            }
        }
        return Math.min(1.0, dot / (a.norm() * b.norm()));
    }

    /** The distinct word stems of a text, for explanations ("matched: vpn, tunnel"). */
    public static List<String> distinctTokens(String text) {
        return Tokenizer.tokens(text).stream().distinct().toList();
    }
}
