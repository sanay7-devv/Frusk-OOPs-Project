package com.iitsm.application.incident.command;

import java.util.Optional;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;

/**
 * One incident action as an object (Command pattern, decision DEC-46, C1). A command says what it does to the
 * incident; the {@link IncidentCommandRunner} does the steps every action shares: load, check who may do it (403),
 * run the command (the State pattern then decides whether the move is legal: 409), leave the note, publish the audit
 * event and build the view. Adding an action means adding one small class, not another copy of those steps.
 */
public interface IncidentCommand {

    /** The action, for the access check ("who may do this"). */
    IncidentAction action();

    /** Changes the incident; throws if the current status does not allow it, in which case nothing is recorded. */
    void perform(Incident incident, CommandContext context);

    /** The public note this action leaves for the reporter (the question, the reply, the reason), if any. */
    default Optional<String> publicNote() {
        return Optional.empty();
    }

    /** The audit wording, with one {@code %s} for the actor's name. Called after {@link #perform}. */
    String auditText(Incident incident);
}
