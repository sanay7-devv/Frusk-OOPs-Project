package com.iitsm.application.incident.command;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;

/** The reporter confirms that the fix works. */
public final class VerifyCommand implements IncidentCommand {

    @Override
    public IncidentAction action() {
        return IncidentAction.VERIFY;
    }

    @Override
    public void perform(Incident incident, CommandContext context) {
        incident.verify(context.now());
    }

    @Override
    public String auditText(Incident incident) {
        return "Fix confirmed by %s";
    }
}
