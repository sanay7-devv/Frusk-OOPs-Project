package com.iitsm.application.incident.command;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Component;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentAccessPolicy;
import com.iitsm.application.incident.IncidentEventPublisher;
import com.iitsm.application.incident.IncidentViewMapper;
import com.iitsm.application.incident.IncidentViews.IncidentDetail;
import com.iitsm.domain.exception.IncidentNotFoundException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.incident.CommentVisibility;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentComment;
import com.iitsm.domain.repository.IncidentCommentRepository;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.sla.SlaPolicyResolver;
import com.iitsm.domain.user.User;

/**
 * Runs an {@link IncidentCommand} with the steps every incident action shares. It must be called inside the
 * transaction of the service method, so a failed step changes nothing (one transaction per action).
 * <ol>
 *   <li>load the incident (404 if unknown);</li>
 *   <li>check who may do the action (403 UNAUTHORIZED_OPERATION);</li>
 *   <li>perform the command (the State pattern may refuse it: 409 INVALID_STATE_TRANSITION);</li>
 *   <li>leave the public note, if the command has one;</li>
 *   <li>publish the audit event from the fact the incident recorded;</li>
 *   <li>return the detail view built inside the transaction.</li>
 * </ol>
 */
@Component
public class IncidentCommandRunner {

    private final IncidentRepository incidents;
    private final IncidentCommentRepository comments;
    private final UserRepository users;
    private final IncidentAccessPolicy access;
    private final IncidentViewMapper views;
    private final IncidentEventPublisher publisher;
    private final SlaPolicyResolver slaPolicies;
    private final ConfigService config;
    private final Clock clock;

    public IncidentCommandRunner(IncidentRepository incidents, IncidentCommentRepository comments,
                                 UserRepository users, IncidentAccessPolicy access, IncidentViewMapper views,
                                 IncidentEventPublisher publisher, SlaPolicyResolver slaPolicies,
                                 ConfigService config, Clock clock) {
        this.incidents = incidents;
        this.comments = comments;
        this.users = users;
        this.access = access;
        this.views = views;
        this.publisher = publisher;
        this.slaPolicies = slaPolicies;
        this.config = config;
        this.clock = clock;
    }

    public IncidentDetail run(AuthenticatedUser caller, Long incidentId, IncidentCommand command) {
        Incident incident = incidents.findById(incidentId)
                .orElseThrow(() -> new IncidentNotFoundException(incidentId));
        access.require(caller, incident, command.action());
        Instant now = clock.instant();
        command.perform(incident, new CommandContext(now, config.current(), slaPolicies));
        User actor = users.findById(caller.id()).orElseThrow(() -> new UserNotFoundException(caller.id()));
        command.publicNote().ifPresent(text -> comments.save(new IncidentComment(incident, actor,
                CommentVisibility.PUBLIC, truncated(text), now)));
        publisher.publishFact(incident, actor, command.auditText(incident).formatted(actor.getName()));
        return views.detail(incident, caller);
    }

    private static String truncated(String text) {
        return text.length() > IncidentComment.MAX_LENGTH ? text.substring(0, IncidentComment.MAX_LENGTH) : text;
    }
}
