package com.iitsm.domain.priority;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;

/**
 * Calculates an incident's priority: the strategy named by priority.strategy produces the score and band, then each
 * override rule may raise the band (handbook 2.5 M5). Later rules win, so rule 2 (always P1) is applied last.
 * A rule whose condition holds is named in the breakdown even if the score already reached its band, so the
 * explanation is always complete ("score 187, Payment service is always P1").
 */
public class PriorityEngine {

    private final Map<String, PriorityStrategy> strategies;
    private final List<PriorityOverrideRule> overrideRules;

    public PriorityEngine(List<PriorityStrategy> strategies, List<PriorityOverrideRule> overrideRules) {
        this.strategies = strategies.stream().collect(Collectors.toMap(PriorityStrategy::name, Function.identity()));
        this.overrideRules = List.copyOf(overrideRules);
    }

    /** The default set-up: the weighted strategy and the two rules from the handbook, in order. */
    public static PriorityEngine standard() {
        return new PriorityEngine(List.of(new WeightedPriorityStrategy()),
                List.of(PriorityOverrideRule.SECURITY_ON_CRITICAL_SERVICE, PriorityOverrideRule.ALWAYS_P1_SERVICE_OUTAGE));
    }

    public PriorityBreakdown calculate(PriorityInput input, AppSettings settings) {
        String strategyName = settings.raw(ConfigKey.PRIORITY_STRATEGY);
        PriorityStrategy strategy = strategies.get(strategyName);
        if (strategy == null) {
            throw new IllegalStateException("No priority strategy named " + strategyName);
        }
        PriorityBreakdown result = strategy.calculate(input, settings);
        for (PriorityOverrideRule rule : overrideRules) {
            PriorityBreakdown current = result;
            result = rule.minimumBand(input)
                    .map(floor -> current.withBand(current.band().atLeast(floor), rule.explanation(input)))
                    .orElse(current);
        }
        return result;
    }
}
