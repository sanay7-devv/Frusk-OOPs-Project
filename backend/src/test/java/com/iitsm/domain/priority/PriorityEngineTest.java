package com.iitsm.domain.priority;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.iitsm.domain.config.AppSettings;

class PriorityEngineTest {

    private final PriorityEngine engine = PriorityEngine.standard();
    private final AppSettings settings = AppSettings.defaults();

    @Test
    void score_band_boundaries_return_expected_priority() {
        record Example(int impact, int urgency, int criticality, int users, int score, Priority priority) {}

        List<Example> examples = List.of(
                new Example(4, 3, 5, 1, 60, Priority.P1),
                new Example(5, 3, 3, 20, 56, Priority.P2),
                new Example(3, 5, 2, 1, 30, Priority.P2),
                new Example(3, 3, 3, 1, 27, Priority.P3),
                new Example(2, 5, 1, 1, 10, Priority.P3),
                new Example(3, 3, 1, 1, 9, Priority.P4));

        for (Example example : examples) {
            PriorityBreakdown result = engine.calculate(
                    new PriorityInput(example.impact(), example.urgency(), example.criticality(), example.users(),
                            "Network", false, false),
                    settings);

            assertEquals(example.score(), result.score());
            assertEquals(example.priority(), result.band());
        }
    }

    @Test
    void affected_user_boundaries_apply_exact_multipliers_and_floor_score() {
        record Example(int users, int score, Priority priority) {}

        List<Example> examples = List.of(
                new Example(9, 48, Priority.P2),
                new Example(10, 60, Priority.P1),
                new Example(100, 60, Priority.P1),
                new Example(101, 72, Priority.P1));

        for (Example example : examples) {
            PriorityBreakdown result = engine.calculate(
                    new PriorityInput(4, 4, 3, example.users(), "Database", false, false),
                    settings);

            assertEquals(48, result.baseScore());
            assertEquals(example.score(), result.score());
            assertEquals(example.priority(), result.band());
        }
    }

    @Test
    void security_on_critical_service_is_raised_to_at_least_p2() {
        PriorityBreakdown result = engine.calculate(
                new PriorityInput(1, 1, 4, 1, "Authentication", false, true),
                settings);

        assertEquals(4, result.score());
        assertEquals(Priority.P2, result.band());
        assertEquals("Security incident on a critical service is at least P2", result.overrideRule());
    }

    @Test
    void always_p1_service_with_impact_four_is_raised_to_p1() {
        PriorityBreakdown result = engine.calculate(
                new PriorityInput(4, 1, 1, 1, "Payment", true, false),
                settings);

        assertEquals(4, result.score());
        assertEquals(Priority.P1, result.band());
        assertEquals("Payment service is always P1", result.overrideRule());
    }
}
