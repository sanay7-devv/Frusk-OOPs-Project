package com.iitsm.application.incident.command;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;

/** The assigned technician acknowledges the incident; the response clock stops. */
public final class AcknowledgeCommand implements IncidentCommand {

    @Override
    public IncidentAction action() {
        return IncidentAction.ACKNOWLEDGE;
    }

    @Override
    public void perform(Incident incident, CommandContext context) {
        incident.acknowledge(context.now());
    }

    @Override
    public String auditText(Incident incident) {
        return "Acknowledged by %s";
    }
}
