package com.iitsm.domain.escalation;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import com.iitsm.domain.priority.Priority;

class EscalationChainTest {
    private static final Instant START = Instant.parse("2026-11-19T00:00:00Z");
    private static final EscalationTimeouts TIMEOUTS = new EscalationTimeouts(
            Map.of(Priority.P1, Map.of(1, Duration.ofMinutes(1),
                    2, Duration.ofMinutes(2), 3, Duration.ofMinutes(3))),
            Duration.ofMinutes(15));

    @Test void chain_forecasts_and_raises_each_level_at_its_boundary() {
        var chain = new EscalationChain();
        for (int level = 0; level < 3; level++) {
            var request = new EscalationRequest(Priority.P1, level, START, false, TIMEOUTS);
            var step = chain.next(request).orElseThrow();
            assertEquals(EscalationStep.Kind.RAISE, step.kind());
            assertEquals(level, step.fromLevel());
            assertEquals(level + 1, step.toLevel());
            assertTrue(chain.due(request, step.dueAt().minusNanos(1)).isEmpty());
            assertEquals(step, chain.due(request, step.dueAt()).orElseThrow());
        }
    }

    @Test void final_level_emits_one_exhausted_alert_then_stops() {
        var chain = new EscalationChain();
        var request = new EscalationRequest(Priority.P1, 3, START, false, TIMEOUTS);
        var step = chain.next(request).orElseThrow();
        assertEquals(EscalationStep.Kind.EXHAUSTED, step.kind());
        assertEquals(3, step.fromLevel());
        assertEquals(3, step.toLevel());
        assertEquals(START.plus(Duration.ofMinutes(15)), step.dueAt());
        assertTrue(chain.due(request, step.dueAt().minusNanos(1)).isEmpty());
        assertEquals(step, chain.due(request, step.dueAt()).orElseThrow());
        assertTrue(chain.next(new EscalationRequest(Priority.P1, 3, START, true, TIMEOUTS)).isEmpty());
    }

    @Test void missing_policy_does_not_invent_a_timeout() {
        var request = new EscalationRequest(Priority.P4, 0, START, false, TIMEOUTS);
        assertTrue(new EscalationChain().next(request).isEmpty());
    }
}
