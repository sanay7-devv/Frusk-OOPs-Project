package com.iitsm.application.incident.command;

import java.util.Optional;

import com.iitsm.domain.escalation.EscalationTarget;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;

/**
 * The assignee, a team lead or an administrator raises the escalation level by one on demand. The status does not
 * change (handbook 1.8). The reason is kept as an internal note for the staff.
 */
public final class EscalateCommand implements IncidentCommand {

    private final String reason;

    public EscalateCommand(String reason) {
        this.reason = reason;
    }

    @Override
    public IncidentAction action() {
        return IncidentAction.ESCALATE;
    }

    @Override
    public void perform(Incident incident, CommandContext context) {
        incident.escalate(context.now());
    }

    @Override
    public Optional<String> internalNote(Incident incident) {
        return Optional.of("Escalated to level " + incident.getEscalationLevel() + ": " + reason);
    }

    @Override
    public String auditText(Incident incident) {
        return "Escalated to level " + incident.getEscalationLevel() + " ("
                + EscalationTarget.ofLevel(incident.getEscalationLevel()).getLabel() + ") by %s";
    }
}
