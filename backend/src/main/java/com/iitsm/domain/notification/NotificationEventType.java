package com.iitsm.domain.notification;

import java.util.List;
import java.util.Optional;

import com.iitsm.domain.audit.AuditAction;

import static com.iitsm.domain.notification.Audience.ADMIN;
import static com.iitsm.domain.notification.Audience.ASSIGNEE;
import static com.iitsm.domain.notification.Audience.OWNER;
import static com.iitsm.domain.notification.Audience.REPORTER;
import static com.iitsm.domain.notification.Audience.TEAM_LEAD;

/**
 * The 15 notification event types of handbook Appendix A.4, each with the people it is meant for (handbook 2.5 M9:
 * reporter on assigned, resolved and closed; technician on assigned and SLA warning; team lead on triage and
 * escalation; admins on SLA violation).
 * <p>
 * The single {@code IncidentChanged} event carries an {@link AuditAction}; {@link #forAction} maps it onto one of
 * these types (decision DEC-54). Actions without a type (classified, priority calculated, work started, comment
 * added) notify nobody. ESCALATED is not mapped either: escalations are announced from the escalation module's own
 * events ({@code IncidentEscalated}, {@code EscalationExhausted}), which carry the exact recipients of each hop
 * (ERROR_LOG E-034).
 */
public enum NotificationEventType {

    INCIDENT_CREATED(REPORTER),
    INCIDENT_ASSIGNED(REPORTER, ASSIGNEE),
    INCIDENT_ACKNOWLEDGED(REPORTER),
    PRIORITY_CHANGED(ASSIGNEE, REPORTER),
    INFO_REQUESTED(REPORTER),
    INFO_PROVIDED(ASSIGNEE),
    /** The assignee; the team leads when nobody is assigned. */
    SLA_WARNING(ASSIGNEE),
    SLA_VIOLATED(ADMIN, ASSIGNEE),
    INCIDENT_ESCALATED(OWNER, ASSIGNEE),
    INCIDENT_RESOLVED(REPORTER),
    INCIDENT_VERIFIED(ASSIGNEE),
    INCIDENT_CLOSED(REPORTER),
    INCIDENT_REOPENED(ASSIGNEE),
    DUPLICATE_SUSPECTED(REPORTER, ASSIGNEE),
    TRIAGE_NEEDED(TEAM_LEAD);

    private final List<Audience> audiences;

    NotificationEventType(Audience... audiences) {
        this.audiences = List.of(audiences);
    }

    /** Who hears about this event, in the order of the list; someone in two groups is notified once. */
    public List<Audience> audiences() {
        return audiences;
    }

    /** The notification type of an incident action, or empty when the action is not announced. */
    public static Optional<NotificationEventType> forAction(AuditAction action) {
        return Optional.ofNullable(switch (action) {
            case INCIDENT_CREATED -> INCIDENT_CREATED;
            case ASSIGNED, REASSIGNED -> INCIDENT_ASSIGNED;
            case ACKNOWLEDGED -> INCIDENT_ACKNOWLEDGED;
            case PRIORITY_CHANGED -> PRIORITY_CHANGED;
            case INFO_REQUESTED -> INFO_REQUESTED;
            case INFO_PROVIDED -> INFO_PROVIDED;
            case RESOLVED -> INCIDENT_RESOLVED;
            case VERIFIED -> INCIDENT_VERIFIED;
            case CLOSED -> INCIDENT_CLOSED;
            case REOPENED -> INCIDENT_REOPENED;
            case DUPLICATE_LINKED -> DUPLICATE_SUSPECTED;
            case ESCALATED, CLASSIFIED, PRIORITY_CALCULATED, WORK_STARTED, COMMENT_ADDED, SLA_WARNING, SLA_VIOLATED,
                 LOGIN_FAILED, ACCESS_DENIED, USER_ROLE_CHANGED, CONFIG_CHANGED, ATTACHMENT_ADDED -> null;
        });
    }
}
