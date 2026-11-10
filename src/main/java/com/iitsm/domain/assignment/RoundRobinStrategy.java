package com.iitsm.domain.assignment;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import com.iitsm.domain.config.AppSettings;

/**
 * Takes turns: the eligible technician whose last assignment is the oldest (never assigned comes first) is next.
 * The score only expresses the place in the rotation (first 1.0, last close to 0).
 */
public class RoundRobinStrategy implements AssignmentStrategy {

    public static final String NAME = "ROUND_ROBIN";

    private static final Comparator<TechnicianCandidate> ROTATION = Comparator
            .comparing((TechnicianCandidate c) -> c.profile().getLastAssignedAt(),
                    Comparator.nullsFirst(Comparator.<Instant>naturalOrder()))
            .thenComparing(c -> c.technician().getId());

    @Override
    public String name() {
        return NAME;
    }

    @Override
    public List<ScoredCandidate> rank(Map<TechnicianCandidate, AssignmentFactors> eligible, AppSettings settings) {
        List<TechnicianCandidate> order = eligible.keySet().stream().sorted(ROTATION).toList();
        List<ScoredCandidate> ranked = new ArrayList<>();
        for (int i = 0; i < order.size(); i++) {
            TechnicianCandidate candidate = order.get(i);
            ranked.add(new ScoredCandidate(candidate, eligible.get(candidate), 1.0 - (double) i / order.size()));
        }
        return ranked;
    }
}
