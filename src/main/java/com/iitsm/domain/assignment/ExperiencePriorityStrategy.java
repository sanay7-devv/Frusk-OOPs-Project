package com.iitsm.domain.assignment;

import com.iitsm.domain.config.AppSettings;

/** P1 and P2 go to senior technicians; P3 and P4 to levels 1-3, keeping seniors free. Experience breaks ties. */
public class ExperiencePriorityStrategy extends FactorStrategy {

    public static final String NAME = "EXPERIENCE_PRIORITY";

    @Override
    public String name() {
        return NAME;
    }

    @Override
    protected double score(AssignmentFactors factors, AppSettings settings) {
        return 0.8 * factors.priorityFit() + 0.2 * factors.experience();
    }
}
