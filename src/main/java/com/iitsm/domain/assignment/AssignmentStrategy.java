package com.iitsm.domain.assignment;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import com.iitsm.domain.config.AppSettings;

/**
 * Strategy pattern: one way of ranking the eligible technicians for an incident (handbook 2.5 M6). The active one is
 * named by the setting assignment.strategy, so an admin switches it at runtime and a new strategy is one new class.
 * Strategies only rank; eligibility is filtered before they are called.
 */
public interface AssignmentStrategy {

    /** The name used in app_config, for example COMPOSITE. */
    String name();

    /** Best first. The input holds only eligible technicians with their factors already computed. */
    List<ScoredCandidate> rank(Map<TechnicianCandidate, AssignmentFactors> eligible, AppSettings settings);

    /**
     * Shared order: higher score first, then round-robin (the one assigned longest ago, never-assigned first),
     * then id, so equal candidates take turns and the result is always deterministic.
     */
    Comparator<ScoredCandidate> BEST_FIRST = Comparator
            .comparingDouble((ScoredCandidate c) -> -roundScore(c.score()))
            .thenComparing(c -> c.candidate().profile().getLastAssignedAt(),
                    Comparator.nullsFirst(Comparator.<Instant>naturalOrder()))
            .thenComparing(c -> c.candidate().technician().getId());

    /** Scores equal to 6 decimals count as a tie, so floating-point noise never beats round-robin. */
    private static double roundScore(double score) {
        return Math.round(score * 1_000_000) / 1_000_000.0;
    }
}
