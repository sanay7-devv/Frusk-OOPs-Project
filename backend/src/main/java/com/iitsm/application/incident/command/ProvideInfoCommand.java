package com.iitsm.application.incident.command;

import java.util.Optional;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;

/** The reporter answers; the resolution clock resumes and the deadline moves later by the paused time. */
public final class ProvideInfoCommand implements IncidentCommand {

    private final String message;

    public ProvideInfoCommand(String message) {
        this.message = message;
    }

    @Override
    public IncidentAction action() {
        return IncidentAction.PROVIDE_INFO;
    }

    @Override
    public void perform(Incident incident, CommandContext context) {
        incident.provideInfo(message, context.now(),
                context.slaPolicyOf(incident).targets(context.settings()).calendar());
    }

    @Override
    public Optional<String> publicNote() {
        return Optional.of(message);
    }

    @Override
    public String auditText(Incident incident) {
        return "Information provided by %s; resolution clock resumed, due " + incident.getSla().getResolutionDue();
    }
}
