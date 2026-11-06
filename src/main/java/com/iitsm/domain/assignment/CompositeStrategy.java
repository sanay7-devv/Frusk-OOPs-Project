package com.iitsm.domain.assignment;

import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;

/**
 * The default: a weighted mix of all five factors. Weights come from app_config (decision DEC-28 defaults: skill
 * 0.35, load 0.25, experience 0.15, priority fit 0.10, service familiarity 0.15; they must add up to 1.0).
 */
public class CompositeStrategy extends FactorStrategy {

    public static final String NAME = "COMPOSITE";

    @Override
    public String name() {
        return NAME;
    }

    @Override
    protected double score(AssignmentFactors f, AppSettings s) {
        return weight(s, ConfigKey.ASSIGNMENT_WEIGHT_SKILL) * f.skill()
                + weight(s, ConfigKey.ASSIGNMENT_WEIGHT_LOAD) * f.load()
                + weight(s, ConfigKey.ASSIGNMENT_WEIGHT_EXPERIENCE) * f.experience()
                + weight(s, ConfigKey.ASSIGNMENT_WEIGHT_PRIORITY) * f.priorityFit()
                + weight(s, ConfigKey.ASSIGNMENT_WEIGHT_FAMILIARITY) * f.familiarity();
    }

    private static double weight(AppSettings settings, ConfigKey key) {
        return settings.decimalValue(key).doubleValue();
    }
}
