package com.iitsm.domain.intelligence;

/**
 * Which engine produced an answer; every intelligence response carries it (handbook 2.5 M12). EMBEDDING is used
 * only by similarity (cosine of model vectors); the other answers are LLM or KEYWORD.
 */
public enum AnalysisSource {
    LLM,
    KEYWORD,
    EMBEDDING
}
