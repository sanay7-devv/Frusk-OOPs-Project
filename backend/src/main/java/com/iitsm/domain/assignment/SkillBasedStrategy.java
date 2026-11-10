package com.iitsm.domain.assignment;

import com.iitsm.domain.config.AppSettings;

/** Best skill match wins (best proficiency among the required skills, plus coverage). */
public class SkillBasedStrategy extends FactorStrategy {

    public static final String NAME = "SKILL";

    @Override
    public String name() {
        return NAME;
    }

    @Override
    protected double score(AssignmentFactors factors, AppSettings settings) {
        return factors.skill();
    }
}
