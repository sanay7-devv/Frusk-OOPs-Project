package com.iitsm.domain.priority;

import java.math.BigDecimal;

/**
 * The result of a priority calculation and its explanation ("why this priority"), stored as JSON in
 * incidents.priority_breakdown and shown to users (API Data Dictionary C.4 PriorityBreakdown).
 *
 * @param baseScore    impact x urgency x criticality
 * @param score        base score x users multiplier, rounded down
 * @param band         the final priority, after override rules
 * @param overrideRule the rule that decided the band, or null if the score alone decided it
 */
public record PriorityBreakdown(int impact, int urgency, int criticality, BigDecimal usersMultiplier, int baseScore,
                                int score, Priority band, String overrideRule) {

    /** Same numbers, different final band and explanation (override rules, manual override). */
    public PriorityBreakdown withBand(Priority newBand, String rule) {
        return new PriorityBreakdown(impact, urgency, criticality, usersMultiplier, baseScore, score, newBand, rule);
    }
}
