package com.iitsm.domain.user;

/** Administrator scope. Also the escalation target: level 2 is SYSTEM_ADMIN, level 3 is IT_MANAGER. */
public enum AdminScope {
    SYSTEM_ADMIN(2),
    IT_MANAGER(3);

    private final int escalationLevel;

    AdminScope(int escalationLevel) {
        this.escalationLevel = escalationLevel;
    }

    public int getEscalationLevel() {
        return escalationLevel;
    }
}
