package com.iitsm.domain.priority;

import java.math.BigDecimal;
import java.math.RoundingMode;

import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;

/**
 * The default priority algorithm (handbook 1.7):
 * score = floor(impact x urgency x criticality x users multiplier), then
 * score >= p1 band gives P1, >= p2 band gives P2, >= p3 band gives P3, else P4.
 * With the default settings: 1-9 users x1.0, 10-100 users x1.25, 101+ users x1.5; bands 60 / 30 / 10.
 */
public class WeightedPriorityStrategy implements PriorityStrategy {

    public static final String NAME = "WEIGHTED";

    @Override
    public String name() {
        return NAME;
    }

    @Override
    public PriorityBreakdown calculate(PriorityInput input, AppSettings settings) {
        int baseScore = input.impact() * input.urgency() * input.criticality();
        BigDecimal multiplier = usersMultiplier(input.affectedUsers(), settings);
        int score = BigDecimal.valueOf(baseScore).multiply(multiplier).setScale(0, RoundingMode.FLOOR).intValue();
        return new PriorityBreakdown(input.impact(), input.urgency(), input.criticality(), multiplier, baseScore,
                score, band(score, settings), null);
    }

    static BigDecimal usersMultiplier(int affectedUsers, AppSettings settings) {
        if (affectedUsers >= settings.intValue(ConfigKey.PRIORITY_USERS_HIGH_THRESHOLD)) {
            return settings.decimalValue(ConfigKey.PRIORITY_USERS_HIGH_MULTIPLIER);
        }
        if (affectedUsers >= settings.intValue(ConfigKey.PRIORITY_USERS_MID_THRESHOLD)) {
            return settings.decimalValue(ConfigKey.PRIORITY_USERS_MID_MULTIPLIER);
        }
        return BigDecimal.ONE;
    }

    static Priority band(int score, AppSettings settings) {
        if (score >= settings.intValue(ConfigKey.PRIORITY_BAND_P1)) {
            return Priority.P1;
        }
        if (score >= settings.intValue(ConfigKey.PRIORITY_BAND_P2)) {
            return Priority.P2;
        }
        if (score >= settings.intValue(ConfigKey.PRIORITY_BAND_P3)) {
            return Priority.P3;
        }
        return Priority.P4;
    }
}
