package com.iitsm.application.incident.command;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;

/** The assigned technician starts (or, after a reopen, resumes) working on the incident. */
public final class StartWorkCommand implements IncidentCommand {

    @Override
    public IncidentAction action() {
        return IncidentAction.START_WORK;
    }

    @Override
    public void perform(Incident incident, CommandContext context) {
        incident.startWork(context.now());
    }

    @Override
    public String auditText(Incident incident) {
        return "Work started by %s";
    }
}
