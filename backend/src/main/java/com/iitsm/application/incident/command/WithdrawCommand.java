package com.iitsm.application.incident.command;

import java.util.Optional;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;

/**
 * The reporter takes the report back before work has started (decision DEC-46, G3): CLASSIFIED, ASSIGNED or
 * ACKNOWLEDGED, reason required. The incident closes as WITHDRAWN; the technician's load drops at once because load
 * is counted from the incidents still in active work.
 */
public final class WithdrawCommand implements IncidentCommand {

    private final String reason;

    public WithdrawCommand(String reason) {
        this.reason = reason;
    }

    @Override
    public IncidentAction action() {
        return IncidentAction.WITHDRAW;
    }

    @Override
    public void perform(Incident incident, CommandContext context) {
        incident.withdraw(reason, context.now());
    }

    @Override
    public Optional<String> publicNote() {
        return Optional.of("Withdrawn: " + reason);
    }

    @Override
    public String auditText(Incident incident) {
        return "Withdrawn by %s (closed as WITHDRAWN)";
    }
}
