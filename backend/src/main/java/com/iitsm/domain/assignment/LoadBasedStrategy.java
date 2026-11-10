package com.iitsm.domain.assignment;

import com.iitsm.domain.config.AppSettings;

/** The least busy eligible technician (lowest weighted load relative to max load) wins. */
public class LoadBasedStrategy extends FactorStrategy {

    public static final String NAME = "LOAD";

    @Override
    public String name() {
        return NAME;
    }

    @Override
    protected double score(AssignmentFactors factors, AppSettings settings) {
        return factors.load();
    }
}
