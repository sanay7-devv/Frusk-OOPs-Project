package com.iitsm.domain.escalation;

import java.util.Optional;

/**
 * Level 3: the IT managers (administrator scope IT_MANAGER), the end of the chain. There is nobody above, so when
 * the incident stays unacknowledged here for the exhausted wait (setting {@code escalation.exhausted.minutes}) the
 * handler asks for the one final "escalation exhausted" alert (DEC-49), and then nothing more.
 */
public final class ItManagerHandler extends EscalationHandler {

    @Override
    public EscalationTarget target() {
        return EscalationTarget.IT_MANAGER;
    }

    @Override
    protected Optional<EscalationStep> step(EscalationRequest request) {
        if (request.exhaustedRaised()) {
            return Optional.empty();
        }
        int level = target().getLevel();
        return Optional.of(new EscalationStep(EscalationStep.Kind.EXHAUSTED, level, level,
                request.levelSince().plus(request.timeouts().exhaustedWait()), request.timeouts().exhaustedWait()));
    }
}
