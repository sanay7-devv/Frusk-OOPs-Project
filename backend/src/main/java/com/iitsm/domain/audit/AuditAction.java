package com.iitsm.domain.audit;

/** Every action the audit trail records (handbook Appendix A.4). */
public enum AuditAction {
    INCIDENT_CREATED,
    CLASSIFIED,
    PRIORITY_CALCULATED,
    PRIORITY_CHANGED,
    ASSIGNED,
    REASSIGNED,
    ACKNOWLEDGED,
    WORK_STARTED,
    INFO_REQUESTED,
    INFO_PROVIDED,
    RESOLVED,
    VERIFIED,
    CLOSED,
    REOPENED,
    ESCALATED,
    COMMENT_ADDED,
    SLA_WARNING,
    SLA_VIOLATED,
    DUPLICATE_LINKED,
    LOGIN_FAILED,
    ACCESS_DENIED,
    USER_ROLE_CHANGED,
    CONFIG_CHANGED,
    // M14 (session C): a file attached to an incident
    ATTACHMENT_ADDED
}
