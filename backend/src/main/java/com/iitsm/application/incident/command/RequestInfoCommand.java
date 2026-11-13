package com.iitsm.application.incident.command;

import java.util.Optional;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;

/** The technician asks the reporter a question; the resolution clock pauses and the question is a public note. */
public final class RequestInfoCommand implements IncidentCommand {

    private final String message;

    public RequestInfoCommand(String message) {
        this.message = message;
    }

    @Override
    public IncidentAction action() {
        return IncidentAction.REQUEST_INFO;
    }

    @Override
    public void perform(Incident incident, CommandContext context) {
        incident.requestInfo(message, context.now());
    }

    @Override
    public Optional<String> publicNote() {
        return Optional.of(message);
    }

    @Override
    public String auditText(Incident incident) {
        return "Information requested by %s; resolution clock paused";
    }
}
