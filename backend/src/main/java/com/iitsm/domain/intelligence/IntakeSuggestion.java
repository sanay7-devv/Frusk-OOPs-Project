package com.iitsm.domain.intelligence;

/** Category plus impact and urgency (1 to 5) suggested from a free-text description. */
public record IntakeSuggestion(Long categoryId, String categoryName, int impact, int urgency, double confidence,
                               String reason, AnalysisSource source) {
}
