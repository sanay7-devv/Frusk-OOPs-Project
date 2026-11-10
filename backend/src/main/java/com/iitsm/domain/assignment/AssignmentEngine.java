package com.iitsm.domain.assignment;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.user.User;

/**
 * Chooses technicians for an incident (handbook 2.5 M6): first the {@link EligibilityFilter} removes everyone who
 * cannot take it (and says why), then the strategy named by assignment.strategy ranks the rest. Switching the
 * setting changes who gets the next incident with no restart.
 */
public class AssignmentEngine {

    /** Someone left out, with the reason shown to the admin ("AWAY", "at max load (10/10)", ...). */
    public record Excluded(User technician, String reason) {
    }

    /** The ranked eligible technicians (best first) and the excluded ones. */
    public record Recommendation(String strategy, List<ScoredCandidate> ranked, List<Excluded> excluded) {

        public Optional<ScoredCandidate> best() {
            return ranked.isEmpty() ? Optional.empty() : Optional.of(ranked.get(0));
        }
    }

    private final Map<String, AssignmentStrategy> strategies;

    public AssignmentEngine(List<AssignmentStrategy> strategies) {
        this.strategies = strategies.stream()
                .collect(Collectors.toMap(AssignmentStrategy::name, Function.identity()));
    }

    /** The five strategies of the handbook; COMPOSITE is the default in app_config. */
    public static AssignmentEngine standard() {
        return new AssignmentEngine(List.of(new CompositeStrategy(), new SkillBasedStrategy(),
                new LoadBasedStrategy(), new RoundRobinStrategy(), new ExperiencePriorityStrategy()));
    }

    public Recommendation recommend(Incident incident, List<TechnicianCandidate> candidates, AppSettings settings) {
        String name = settings.raw(ConfigKey.ASSIGNMENT_STRATEGY);
        AssignmentStrategy strategy = strategies.get(name);
        if (strategy == null) {
            throw new IllegalStateException("No assignment strategy named " + name);
        }
        Map<TechnicianCandidate, AssignmentFactors> eligible = new LinkedHashMap<>();
        List<Excluded> excluded = new ArrayList<>();
        for (TechnicianCandidate candidate : candidates) {
            EligibilityFilter.check(candidate.technician(), incident, candidate.currentLoad()).ifPresentOrElse(
                    problem -> excluded.add(new Excluded(candidate.technician(), problem.reason())),
                    () -> eligible.put(candidate, AssignmentFactors.of(incident, candidate, settings)));
        }
        return new Recommendation(name, strategy.rank(eligible, settings), excluded);
    }
}
