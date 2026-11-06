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
}
