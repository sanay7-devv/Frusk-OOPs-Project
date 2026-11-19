package com.iitsm.domain.intelligence;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class SlaRiskScorerTest {
    private static final SlaRiskScorer.Weights WEIGHTS =
            new SlaRiskScorer.Weights(0.50, 0.20, 0.15, 0.15);

    @Test void factors_add_to_score_and_high_risk_is_flagged() {
        var inputs = new SlaRiskScorer.Inputs(
                0.8, "80 percent elapsed", 0.5, "half capacity",
                1.0, "P1", 0.6, "past resolution");
        var result = SlaRiskScorer.score(inputs, WEIGHTS, 0.70);
        assertEquals(0.74, result.score(), 1e-9);
        assertEquals(SlaRiskScorer.Level.HIGH, result.level());
        assertTrue(result.atRisk());
        assertEquals(4, result.factors().size());
        assertEquals(result.score(),
                result.factors().stream().mapToDouble(SlaRiskScorer.Factor::contribution).sum(), 1e-9);
    }

    @Test void ratios_are_clamped_and_levels_change_at_exact_boundaries() {
        var outside = new SlaRiskScorer.Inputs(
                -5, "early", 5, "overloaded", 1, "P1", 0, "none");
        var result = SlaRiskScorer.score(outside, WEIGHTS, 0.70);
        assertEquals(0.35, result.score(), 1e-9);
        assertEquals(SlaRiskScorer.Level.LOW, result.level());
        assertEquals(SlaRiskScorer.Level.MEDIUM, SlaRiskScorer.levelOf(0.40, 0.70));
        assertEquals(SlaRiskScorer.Level.HIGH, SlaRiskScorer.levelOf(0.70, 0.70));
        assertEquals(1.0, SlaRiskScorer.priorityRatio(0), 1e-9);
        assertEquals(0.25, SlaRiskScorer.priorityRatio(3), 1e-9);
    }

    @Test void completed_incident_has_no_running_risk() {
        var result = SlaRiskScorer.finished("Already resolved");
        assertEquals(0, result.score(), 1e-9);
        assertFalse(result.atRisk());
        assertEquals("Already resolved", result.factors().getFirst().detail());
    }
}
