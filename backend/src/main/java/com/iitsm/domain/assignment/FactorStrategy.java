package com.iitsm.domain.assignment;

import java.util.List;
import java.util.Map;

import com.iitsm.domain.config.AppSettings;

/**
 * Base for the strategies that rank by a score computed from the factors (all except round-robin). Subclasses only
 * say how to score one candidate; sorting and tie-breaking are shared.
 */
public abstract class FactorStrategy implements AssignmentStrategy {

    protected abstract double score(AssignmentFactors factors, AppSettings settings);

    @Override
    public final List<ScoredCandidate> rank(Map<TechnicianCandidate, AssignmentFactors> eligible,
                                            AppSettings settings) {
        return eligible.entrySet().stream()
                .map(e -> new ScoredCandidate(e.getKey(), e.getValue(), score(e.getValue(), settings)))
                .sorted(BEST_FIRST)
                .toList();
    }
}
