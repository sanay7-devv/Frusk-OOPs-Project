package com.iitsm.domain.intelligence;

import java.util.List;

/**
 * The intelligence port (Strategy pattern): everything the system can infer from incident text. Implementations are
 * the offline {@code KeywordTextAnalysisService}, the {@code LlmTextAnalysisService} adapter and the
 * {@code FallbackTextAnalysisService} that chooses between them. Callers never know which engine answered, except
 * through the {@code source} on each result.
 * <p>
 * {@link #findSimilar} is the single entry point for every "does this look like that" question: the
 * suggestion endpoints now, and later the duplicate check on incident creation, mark-duplicate, problem-record
 * grouping and Major Incident Mode. It returns raw scores; the caller applies the duplicate or related threshold.
 * <p>
 * Incident text is untrusted input: implementations must treat it as data and never as instructions.
 */
public interface TextAnalysisService {

    /** The best category for a draft incident; a null category id means nothing fits. */
    CategorySuggestion suggestCategory(String title, String description, AnalysisContext context);

    /** Category plus impact and urgency for a free-text description. */
    IntakeSuggestion suggestIntake(String description, AnalysisContext context);

    /**
     * Scores {@code candidates} against the query text, best first, dropping scores of zero. The caller chooses the
     * candidates (for duplicates: open incidents of the same service inside the look-back window) and the
     * threshold; {@code corpus} gives TF-IDF its rarity weights.
     */
    List<SimilarMatch> findSimilar(String title, String description, List<TextRecord> candidates,
                                   List<String> corpus);

    /**
     * The same scoring with an embedding when it can be used: if {@code queryVector} and every candidate's vector
     * exist, the cosine of the vectors (source EMBEDDING); otherwise TF-IDF (source KEYWORD). The caller applies the
     * threshold pair that belongs to the returned source.
     */
    SimilarResult findSimilarScored(String title, String description, double[] queryVector,
                                    List<TextRecord> candidates, List<String> corpus);

    /** A short summary of an incident's comments and audit entries, with handover notes. */
    ThreadSummary summarize(ThreadInput input);
}
