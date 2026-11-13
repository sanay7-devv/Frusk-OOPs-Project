package com.iitsm.domain.notification;

/**
 * The part a person plays in an incident when a notification reaches them. It picks the wording (the same event
 * reads differently for the reporter and for the technician) and the people (see {@link NotificationEventType}).
 */
public enum Audience {
    /** The employee who reported the incident. */
    REPORTER("reporter"),
    /** The technician currently assigned. */
    ASSIGNEE("technician"),
    /** Every active team lead (technician with escalation level 1), one global pool for now (DEC-42). */
    TEAM_LEAD("lead"),
    /** Every active administrator. */
    ADMIN("admin"),
    /** Whoever holds the escalation level the incident was just raised to. */
    OWNER("owner"),
    /** A shared chat room, not a person: the chat webhook channel. */
    ROOM("room");

    private final String templateKey;

    Audience(String templateKey) {
        this.templateKey = templateKey;
    }

    /** The word used in the template file, for example {@code INCIDENT_ASSIGNED.technician.title}. */
    public String templateKey() {
        return templateKey;
    }
}
