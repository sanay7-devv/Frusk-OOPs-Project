package com.iitsm.domain.escalation;

/** Level 2: the system administrators (administrator scope SYSTEM_ADMIN). Passes the incident to the IT manager. */
public final class SystemAdminHandler extends EscalationHandler {

    @Override
    public EscalationTarget target() {
        return EscalationTarget.SYSTEM_ADMIN;
    }
}
