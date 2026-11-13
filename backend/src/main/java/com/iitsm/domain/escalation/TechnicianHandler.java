package com.iitsm.domain.escalation;

/**
 * Level 0: the assigned technician, or nobody for an incident still in triage (DEC-48). When the technician (or
 * the triage queue) lets the first timeout pass, the incident moves to the team lead.
 */
public final class TechnicianHandler extends EscalationHandler {

    @Override
    public EscalationTarget target() {
        return EscalationTarget.TECHNICIAN;
    }
}
