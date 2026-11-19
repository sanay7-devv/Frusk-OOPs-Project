package com.iitsm.domain.assignment;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.user.UserFactory;

class AssignmentStrategyTests {
    private static final Instant NOW = Instant.parse("2026-11-19T00:00:00Z");
    private final AppSettings settings = AppSettings.defaults();

    private TechnicianCandidate candidate(String email, Instant assignedAt) {
        var user = new UserFactory(Clock.fixed(NOW, ZoneOffset.UTC))
                .newEmployee(email, email, "hash", "IT");
        var role = user.grantTechnicianRole(NOW, 3, 0, 10);
        role.getProfile().markAssigned(assignedAt);
        return new TechnicianCandidate(user, role.getProfile(), 0, 0);
    }

    private Map<TechnicianCandidate, AssignmentFactors> candidates() {
        var older = candidate("older@iitsm.demo", NOW.minusSeconds(60));
        var newer = candidate("newer@iitsm.demo", NOW);
        Map<TechnicianCandidate, AssignmentFactors> rows = new LinkedHashMap<>();
        rows.put(older, new AssignmentFactors(.8, .2, .6, .5, .4, java.util.List.of()));
        rows.put(newer, new AssignmentFactors(.5, .8, .4, .8, .2, java.util.List.of()));
        return rows;
    }

    @Test void factor_strategies_rank_by_their_named_factor() {
        var rows = candidates();
        assertEquals(.8, new SkillBasedStrategy().rank(rows, settings).getFirst().score(), 1e-9);
        assertEquals(.8, new LoadBasedStrategy().rank(rows, settings).getFirst().score(), 1e-9);
        assertEquals("older@iitsm.demo",
                new SkillBasedStrategy().rank(rows, settings).getFirst().candidate().technician().getEmail());
        assertEquals("newer@iitsm.demo",
                new LoadBasedStrategy().rank(rows, settings).getFirst().candidate().technician().getEmail());
    }

    @Test void composite_strategy_uses_default_weights_and_stable_score() {
        var ranked = new CompositeStrategy().rank(candidates(), settings);
        assertEquals("newer@iitsm.demo", ranked.getFirst().candidate().technician().getEmail());
        assertEquals(.545, ranked.getFirst().score(), 1e-9);
        assertEquals(55, ranked.getFirst().percent());
    }

    @Test void experience_priority_favors_senior_fit_for_critical_work() {
        var senior = candidate("senior@iitsm.demo", NOW.minusSeconds(60));
        var junior = candidate("junior@iitsm.demo", NOW);
        Map<TechnicianCandidate, AssignmentFactors> rows = Map.of(
                senior, new AssignmentFactors(.4, .4, 1.0, 1.0, .4, java.util.List.of()),
                junior, new AssignmentFactors(.9, .9, .4, .4, .9, java.util.List.of()));
        var ranked = new ExperiencePriorityStrategy().rank(rows, settings);
        assertSame(senior, ranked.getFirst().candidate());
        assertEquals(1.0, ranked.getFirst().score(), 1e-9);
    }
}
