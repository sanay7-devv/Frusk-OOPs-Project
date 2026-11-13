package com.iitsm.application.incident.command;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;
import com.iitsm.domain.incident.Resolution;

/** The assigned technician resolves the incident with the root cause, the notes and the steps taken. */
public final class ResolveCommand implements IncidentCommand {

    private final Resolution resolution;

    public ResolveCommand(String rootCause, String notes, String steps, Integer timeSpentMinutes,
                          boolean reusableSolution) {
        this.resolution = new Resolution(rootCause, notes, steps,
                timeSpentMinutes == null ? 0 : timeSpentMinutes, reusableSolution);
    }

    @Override
    public IncidentAction action() {
        return IncidentAction.RESOLVE;
    }

    @Override
    public void perform(Incident incident, CommandContext context) {
        incident.resolve(resolution, context.now());
    }

    @Override
    public String auditText(Incident incident) {
        return "Resolved by %s";
    }
}
