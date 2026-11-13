package com.iitsm.application.incident;

import java.time.Clock;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import com.iitsm.domain.event.IncidentChanged;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentFact;
import com.iitsm.domain.user.User;

/**
 * Turns the facts an incident recorded into {@link IncidentChanged} events (Observer pattern): it adds the actor and
 * the wording, which the domain does not know (decision DEC-46, C2). Shared by the incident service and the command
 * runner, so there is one place where an incident fact becomes an event.
 */
@Component
public class IncidentEventPublisher {

    private final ApplicationEventPublisher events;
    private final Clock clock;

    public IncidentEventPublisher(ApplicationEventPublisher events, Clock clock) {
        this.events = events;
        this.clock = clock;
    }

    /**
     * Publishes the one fact the incident recorded for the action just performed. Failing here when the incident
     * recorded nothing (or more than one fact) turns a forgotten audit entry into an error instead of a silent gap.
     */
    public void publishFact(Incident incident, User actor, String description) {
        List<IncidentFact> facts = incident.drainFacts();
        if (facts.size() != 1) {
            throw new IllegalStateException("Expected one recorded fact for " + incident.getCode() + " but found "
                    + facts.size() + ": " + facts);
        }
        publish(incident, facts.get(0), actor, description);
    }

    /** Publishes one fact; {@code actor} is null for steps the system performs itself. */
    public void publish(Incident incident, IncidentFact fact, User actor, String description) {
        events.publishEvent(new IncidentChanged(incident.getId(), incident.getCode(), fact.action(),
                actor == null ? null : actor.getId(), fact.before(), fact.after(), description, clock.instant()));
    }
}
