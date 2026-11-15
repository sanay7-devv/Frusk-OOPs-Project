package com.iitsm.application.intelligence;

import java.util.List;

import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.intelligence.AnalysisSource;
import com.iitsm.domain.intelligence.SlaRiskScorer;

/** The shapes of the intelligence endpoints (API Data Dictionary C.6). Built from plain values, never entities. */
public final class IntelligenceViews {

    private IntelligenceViews() {
    }

    /** Null category and empty reason when the confidence is below autocat.min.confidence. */
    public record CategorySuggestionView(Long categoryId, String categoryName, double confidence, String reason,
                                         AnalysisSource source) {
    }

    public record IntakeSuggestionView(Long categoryId, String categoryName, int impact, int urgency,
                                       double confidence, String reason, AnalysisSource source) {
    }

    /**
     * DUPLICATE: at or above the duplicate threshold; RELATED: at or above the related threshold. {@code source}
     * says which engine scored it (EMBEDDING cosine of vectors, or KEYWORD TF-IDF): the two scales differ.
     */
    public enum MatchKind { DUPLICATE, RELATED }

    public record SimilarIncidentView(Long incidentId, String code, String title, double similarity,
                                      IncidentStatus status, MatchKind match, AnalysisSource source) {
    }

    public record SuggestedResolutionView(Long fromIncidentId, String code, String title, double similarity,
                                          String rootCause, String notes, String steps, boolean reusable) {
    }

    public record ThreadSummaryView(String summary, List<String> handoverNotes, AnalysisSource source) {
    }

    public record RiskFactorView(String name, double contribution, String detail) {
    }

    public record SlaRiskView(double score, SlaRiskScorer.Level level, boolean atRisk, double threshold,
                              List<RiskFactorView> factors) {
    }
}
