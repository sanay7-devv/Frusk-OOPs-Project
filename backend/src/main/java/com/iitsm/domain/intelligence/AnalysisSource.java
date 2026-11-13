package com.iitsm.domain.intelligence;

/** Which engine produced an answer; every intelligence response carries it (handbook 2.5 M12). */
public enum AnalysisSource {
    LLM,
    KEYWORD
}
