package com.iitsm.domain.notification;

import java.util.EnumSet;
import java.util.Set;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.user.RoleType;
import com.iitsm.domain.user.User;

import static com.iitsm.domain.notification.NotificationEventType.INCIDENT_ASSIGNED;
import static com.iitsm.domain.notification.NotificationEventType.INCIDENT_ESCALATED;
import static com.iitsm.domain.notification.NotificationEventType.INCIDENT_RESOLVED;
import static com.iitsm.domain.notification.NotificationEventType.INFO_REQUESTED;
import static com.iitsm.domain.notification.NotificationEventType.SLA_VIOLATED;
import static com.iitsm.domain.notification.NotificationEventType.SLA_WARNING;
import static com.iitsm.domain.notification.NotificationEventType.TRIAGE_NEEDED;

/**
 * The fixed rules of M9 that are not settings: which alerts cannot be switched off (decision DEC-40), when the SMS
 * channel applies (P1 only), which events also go to the chat room, and which alerts are never batched into a digest
 * (decision DEC-42). Pure functions, so they can be tested without Spring or a database.
 */
public final class NotificationRules {

    /** Events urgent enough for a text message when the incident is P1 (never for the reporter). */
    private static final Set<NotificationEventType> SMS_EVENTS =
            EnumSet.of(INCIDENT_ASSIGNED, TRIAGE_NEEDED, SLA_WARNING, SLA_VIOLATED, INCIDENT_ESCALATED);

    /** Events urgent enough for a push when the incident is P1 or P2. */
    private static final Set<NotificationEventType> PUSH_URGENT =
            EnumSet.of(INCIDENT_ASSIGNED, TRIAGE_NEEDED, SLA_WARNING, SLA_VIOLATED, INCIDENT_ESCALATED);

    /** Events a push helps with at any priority: the reporter is asked something or the fix arrived. */
    private static final Set<NotificationEventType> PUSH_PERSONAL = EnumSet.of(INFO_REQUESTED, INCIDENT_RESOLVED);

    /** Events always posted to the chat room. */
    private static final Set<NotificationEventType> CHAT_ALWAYS = EnumSet.of(SLA_VIOLATED, INCIDENT_ESCALATED);

    /** Events posted to the chat room only for P1. */
    private static final Set<NotificationEventType> CHAT_P1_ONLY = EnumSet.of(INCIDENT_ASSIGNED, TRIAGE_NEEDED, SLA_WARNING);

    private NotificationRules() {
    }

    /** SMS is simulated for P1 incidents only, and only for the staff who must act, not for the reporter. */
    public static boolean smsApplies(Priority priority, NotificationEventType type, Audience audience) {
        return priority == Priority.P1 && SMS_EVENTS.contains(type)
                && audience != Audience.REPORTER && audience != Audience.ROOM;
    }

    /**
     * A simulated push (A4) for the urgent events of a P1 or P2 incident, and at any priority when the reporter is asked
     * for information or the incident is resolved. Never for the chat room. It still reaches only people who
     * registered a device, and it is not a per-user switch.
     */
    public static boolean pushApplies(Priority priority, NotificationEventType type, Audience audience) {
        if (audience == Audience.ROOM) {
            return false;
        }
        boolean urgentIncident = priority == Priority.P1 || priority == Priority.P2;
        return (urgentIncident && PUSH_URGENT.contains(type)) || PUSH_PERSONAL.contains(type);
    }

    /** Whether the shared chat room hears about this event. */
    public static boolean chatApplies(Priority priority, NotificationEventType type) {
        return CHAT_ALWAYS.contains(type) || (priority == Priority.P1 && CHAT_P1_ONLY.contains(type));
    }

    /**
     * A critical alert for this person: the SLA violation for an administrator, the escalation for a team lead or an
     * administrator (the possible new owners). It reaches them whatever their preferences say.
     */
    public static boolean isCritical(User user, NotificationEventType type) {
        if (type == SLA_VIOLATED) {
            return user.hasRole(RoleType.ADMINISTRATOR);
        }
        if (type == INCIDENT_ESCALATED) {
            return user.hasRole(RoleType.ADMINISTRATOR) || isTeamLead(user);
        }
        return false;
    }

    /** True for a technician with escalation level 1. */
    public static boolean isTeamLead(User user) {
        return user.technicianRole().map(role -> role.getProfile().isTeamLead()).orElse(false);
    }

    /** The inbox is always kept; critical alerts stay on in every channel. Everything else can be switched off. */
    public static boolean cannotSwitchOff(User user, NotificationEventType type, ChannelType channel) {
        return channel == ChannelType.IN_APP || isCritical(user, type);
    }

    /**
     * Whether an audited incident action is announced at all. DUPLICATE_LINKED covers two moves: closing an incident as
     * a duplicate (mark-duplicate, a known-outage join), which is announced, and grouping it into a problem record,
     * which keeps the status and stays quiet: the reporter may just have confirmed "not a duplicate", and staff see the
     * grouping in the history and on the problem view (user decision 2026-11-14, ERROR_LOG E-035).
     */
    public static boolean announced(AuditAction action, IncidentStatus newState) {
        return action != AuditAction.DUPLICATE_LINKED || newState == IncidentStatus.CLOSED;
    }

    /** P1 incidents and SLA violations are always sent one by one, never folded into a digest. */
    public static boolean neverBatched(Priority priority, NotificationEventType type) {
        return priority == Priority.P1 || type == SLA_VIOLATED;
    }
}
