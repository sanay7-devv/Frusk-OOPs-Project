package com.iitsm.domain.intelligence;

/** A suggested category with a confidence from 0 to 1 and a one-line reason; null category = no suggestion. */
public record CategorySuggestion(Long categoryId, String categoryName, double confidence, String reason,
                                 AnalysisSource source) {

    public static CategorySuggestion none(AnalysisSource source) {
        return new CategorySuggestion(null, null, 0, "", source);
    }
}
