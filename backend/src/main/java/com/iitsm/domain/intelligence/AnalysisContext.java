package com.iitsm.domain.intelligence;

import java.util.List;

/**
 * What the engines need besides the text itself, loaded by the application layer so the engines stay free of
 * storage: the active categories, past categorised incidents, and the recent incident texts that give TF-IDF its
 * word-rarity weights.
 */
public record AnalysisContext(List<CategoryOption> categories, List<LabelledText> history, List<String> corpus) {

    public AnalysisContext {
        categories = List.copyOf(categories);
        history = List.copyOf(history);
        corpus = List.copyOf(corpus);
    }
}
