package com.iitsm.application.escalation;

import java.time.Clock;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.incident.IncidentViews.IncidentDetail;
import com.iitsm.application.incident.command.EscalateCommand;
import com.iitsm.application.incident.command.IncidentCommandRunner;
import com.iitsm.domain.escalation.EscalationTarget;
import com.iitsm.domain.event.IncidentEscalated;
import com.iitsm.domain.user.User;

/**
 * Manual escalation, {@code POST /incidents/{id}/escalate}: the same move the monitor makes, on demand. The command
 * runner checks who may do it (403) and whether the status allows it (409), records the fact and the audit entry;
 * this service then publishes {@link IncidentEscalated} for the notification module.
 */
@Service
public class EscalationService {

    private final IncidentCommandRunner commands;
    private final EscalationRecipients recipients;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public EscalationService(IncidentCommandRunner commands, EscalationRecipients recipients,
                             ApplicationEventPublisher events, Clock clock) {
        this.commands = commands;
        this.recipients = recipients;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public IncidentDetail escalate(AuthenticatedUser caller, Long id, String reason) {
        IncidentDetail detail = commands.run(caller, id, new EscalateCommand(reason));
        int level = detail.escalationLevel();
        EscalationTarget target = EscalationTarget.ofLevel(level);
        List<Long> holders = recipients.holdersOf(target).stream().map(User::getId).toList();
        events.publishEvent(new IncidentEscalated(detail.id(), detail.code(), detail.priority(), level - 1, level,
                target, holders, detail.assignee() == null ? null : detail.assignee().id(), true, caller.id(),
                clock.instant()));
        return detail;
    }
}
