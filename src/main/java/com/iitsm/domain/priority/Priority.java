package com.iitsm.domain.priority;

/** Incident priority bands (API Data Dictionary C.2). Stored as CHAR(2). */
public enum Priority {
    P1("Critical"),
    P2("High"),
    P3("Medium"),
    P4("Low");

    private final String label;

    Priority(String label) {
        this.label = label;
    }

    /** For example "P1 Critical". */
    public String displayName() {
        return name() + " " + label;
    }

    /** The more urgent of this and {@code floor}: "at least P2" turns P3 or P4 into P2 and leaves P1 alone. */
    public Priority atLeast(Priority floor) {
        return this.ordinal() <= floor.ordinal() ? this : floor;
    }

    /** Workload points of one active incident (handbook 1.7): P1 4, P2 3, P3 2, P4 1. */
    public int workloadWeight() {
        return 4 - ordinal();
    }
}
