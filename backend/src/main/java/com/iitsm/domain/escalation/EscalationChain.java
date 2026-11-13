package com.iitsm.domain.escalation;

import java.time.Instant;
import java.util.Optional;

/** The chain technician, team lead, system administrator, IT manager, linked once (handbook 1.7). */
public final class EscalationChain {

    private final EscalationHandler head = new TechnicianHandler();

    public EscalationChain() {
        head.then(new TeamLeadHandler()).then(new SystemAdminHandler()).then(new ItManagerHandler());
    }

    /** The step to perform now, if the timeout of the incident's level has passed. */
    public Optional<EscalationStep> due(EscalationRequest request, Instant now) {
        return head.handle(request, now);
    }

    /** The next step and when it happens, due or not. */
    public Optional<EscalationStep> next(EscalationRequest request) {
        return head.forecast(request);
    }
}
