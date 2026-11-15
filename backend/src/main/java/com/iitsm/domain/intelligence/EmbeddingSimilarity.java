package com.iitsm.domain.intelligence;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Cosine similarity of embedding vectors (DEC-M12-10). Scores only make sense on one scale, so the ranking is
 * all-or-nothing: if the query or any candidate has no vector of the same length the result is empty and the caller
 * uses TF-IDF for the whole request instead of mixing two scales.
 */
public final class EmbeddingSimilarity {

    private EmbeddingSimilarity() {
    }

    /** Candidates scored against the query, best first, scores at or below zero dropped; empty if not comparable. */
    public static Optional<List<SimilarMatch>> rank(double[] query, List<TextRecord> candidates) {
        if (query == null || query.length == 0) {
            return Optional.empty();
        }
        List<SimilarMatch> matches = new ArrayList<>();
        for (TextRecord candidate : candidates) {
            double[] vector = candidate.vector();
            if (vector == null || vector.length != query.length) {
                return Optional.empty();
            }
            double similarity = cosine(query, vector);
            if (similarity > 0) {
                matches.add(new SimilarMatch(candidate.id(), Math.min(1.0, similarity)));
            }
        }
        matches.sort(Comparator.comparingDouble(SimilarMatch::similarity).reversed()
                .thenComparing(SimilarMatch::id));
        return Optional.of(matches);
    }

    public static double cosine(double[] a, double[] b) {
        double dot = 0;
        double na = 0;
        double nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        return na == 0 || nb == 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
    }
}
