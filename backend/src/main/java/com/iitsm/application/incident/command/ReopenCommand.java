package com.iitsm.application.incident.command;

import java.util.Optional;

import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;

/** The reporter or an administrator reopens a resolved or recently closed incident; the SLA clock restarts. */
public final class ReopenCommand implements IncidentCommand {

    private final String reason;

    public ReopenCommand(String reason) {
        this.reason = reason;
    }

    @Override
    public IncidentAction action() {
        return IncidentAction.REOPEN;
    }

    @Override
    public void perform(Incident incident, CommandContext context) {
        AppSettings settings = context.settings();
        incident.reopen(reason, context.now(), settings.reopenWindow(),
                context.slaPolicyOf(incident).targets(settings));
    }

    @Override
    public Optional<String> publicNote() {
        return Optional.of("Reopened: " + reason);
    }

    @Override
    public String auditText(Incident incident) {
        return "Reopened by %s; resolution clock restarted, due " + incident.getSla().getResolutionDue();
    }
}
