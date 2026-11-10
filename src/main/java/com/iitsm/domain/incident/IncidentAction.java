package com.iitsm.domain.incident;

/**
 * Everything a user can do to an incident (API Data Dictionary C.2). The server sends the ones the current user may
 * do right now as allowedActions, and the frontend shows exactly those buttons.
 */
public enum IncidentAction {
    EDIT,
    COMMENT,
    ASSIGN,
    ACKNOWLEDGE,
    START_WORK,
    REQUEST_INFO,
    PROVIDE_INFO,
    RESOLVE,
    VERIFY,
    CLOSE,
    REOPEN,
    REASSIGN,
    ESCALATE,
    OVERRIDE_PRIORITY,
    MARK_DUPLICATE,
    GIVE_FEEDBACK
}
