package com.iitsm.domain.escalation;

import java.time.Instant;
import java.util.Optional;

/**
 * One link of the escalation chain (Chain of Responsibility, handbook 2.5 M11). Each handler owns one level: an
 * incident at that level is its business, an incident at another level is passed to the next handler. A handler
 * decides whether the time its level may take has passed and then either acts (returns the step to perform) or
 * stays silent. Pure domain: it knows nothing about the database, the scheduler or notifications.
 */
public abstract class EscalationHandler {

    private EscalationHandler next;

    /** The level this handler is responsible for. */
    public abstract EscalationTarget target();

    /** Sets the handler that receives what this one does not own, and returns it so links can be chained. */
    public EscalationHandler then(EscalationHandler successor) {
        this.next = successor;
        return successor;
    }

    /** The step to perform right now, or empty if the incident's timeout at its level has not passed. */
    public final Optional<EscalationStep> handle(EscalationRequest request, Instant now) {
        return route(request).filter(step -> step.isDue(now));
    }

    /** When the next step will happen, even if it is not due yet (the escalation preview). */
    public final Optional<EscalationStep> forecast(EscalationRequest request) {
        return route(request);
    }

    private Optional<EscalationStep> route(EscalationRequest request) {
        if (request.currentLevel() == target().getLevel()) {
            return step(request);
        }
        return next == null ? Optional.empty() : next.route(request);
    }

    /** What happens when the incident stays too long at this level. By default it moves up one level. */
    protected Optional<EscalationStep> step(EscalationRequest request) {
        int level = target().getLevel();
        return request.timeouts().timeToReach(request.priority(), level + 1)
                .map(allowed -> new EscalationStep(EscalationStep.Kind.RAISE, level, level + 1,
                        request.levelSince().plus(allowed), allowed));
    }
}
