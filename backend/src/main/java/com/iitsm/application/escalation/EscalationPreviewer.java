package com.iitsm.application.escalation;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Component;

import com.iitsm.application.escalation.EscalationViews.EscalationPreview;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.domain.escalation.EscalationStep;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.user.User;

/** Builds the escalation preview of the incident detail (A11, DEC-50). Staff only: the reporter never sees it. */
@Component
public class EscalationPreviewer {

    private final EscalationPlanner planner;
    private final EscalationRecipients recipients;

    public EscalationPreviewer(EscalationPlanner planner, EscalationRecipients recipients) {
        this.planner = planner;
        this.recipients = recipients;
    }

    /** Null when the incident is not being watched (not P1 or P2, acknowledged, or nothing left to do). */
    public EscalationPreview preview(Incident incident, Instant now) {
        return planner.next(incident).map(step -> build(step, now)).orElse(null);
    }

    private EscalationPreview build(EscalationStep step, Instant now) {
        boolean exhausted = step.kind() == EscalationStep.Kind.EXHAUSTED;
        List<User> people = exhausted ? recipients.administrators() : recipients.holdersOf(step.target());
        long remaining = Math.max(0, Duration.between(now, step.dueAt()).toSeconds());
        String role = exhausted ? "All administrators" : step.target().getLabel();
        return new EscalationPreview(step.kind(), step.fromLevel(), step.toLevel(), role, step.dueAt(), remaining,
                people.stream().map(u -> new Ref(u.getId(), u.getName())).toList());
    }
}
