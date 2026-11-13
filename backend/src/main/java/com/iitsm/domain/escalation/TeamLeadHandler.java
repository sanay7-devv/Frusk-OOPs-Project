package com.iitsm.domain.escalation;

/** Level 1: the team lead (a technician with escalation level 1). Passes the incident to the system administrator. */
public final class TeamLeadHandler extends EscalationHandler {

    @Override
    public EscalationTarget target() {
        return EscalationTarget.TEAM_LEAD;
    }
}
