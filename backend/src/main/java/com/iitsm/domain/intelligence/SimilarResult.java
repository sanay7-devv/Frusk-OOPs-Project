package com.iitsm.domain.intelligence;

import java.util.List;

/** Similarity scores, best first, and the engine whose scale they are on (the caller picks thresholds by it). */
public record SimilarResult(List<SimilarMatch> matches, AnalysisSource source) {
}
