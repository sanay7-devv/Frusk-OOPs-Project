package com.iitsm.application.incident.command;

import com.iitsm.domain.incident.ClosureReason;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;

/** An administrator closes a verified incident. */
public final class CloseCommand implements IncidentCommand {

    @Override
    public IncidentAction action() {
        return IncidentAction.CLOSE;
    }

    @Override
    public void perform(Incident incident, CommandContext context) {
        incident.close(ClosureReason.VERIFIED, context.now());
    }

    @Override
    public String auditText(Incident incident) {
        return "Closed by %s (reason VERIFIED)";
    }
}
