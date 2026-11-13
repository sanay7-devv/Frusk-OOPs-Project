package com.iitsm.domain.escalation;

/** Who sits at each level of the escalation chain (handbook 1.7). Level 0 is the technician, or nobody in triage. */
public enum EscalationTarget {
    TECHNICIAN(0, "Technician"),
    TEAM_LEAD(1, "Team Lead"),
    SYSTEM_ADMIN(2, "System Administrator"),
    IT_MANAGER(3, "IT Manager");

    public static final int TOP_LEVEL = 3;

    private final int level;
    private final String label;

    EscalationTarget(int level, String label) {
        this.level = level;
        this.label = label;
    }

    public int getLevel() {
        return level;
    }

    public String getLabel() {
        return label;
    }

    public static EscalationTarget ofLevel(int level) {
        for (EscalationTarget target : values()) {
            if (target.level == level) {
                return target;
            }
        }
        throw new IllegalArgumentException("No escalation level " + level);
    }
}
