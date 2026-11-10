package com.iitsm.domain.user;

/**
 * Fine-grained permissions (API Data Dictionary C.2). Security checks use these, never role names, so a user who
 * holds several roles simply gets the union.
 */
public enum PermissionKey {
    INCIDENT_CREATE,
    INCIDENT_VIEW_OWN,
    INCIDENT_VIEW_ASSIGNED,
    INCIDENT_VIEW_TEAM,
    INCIDENT_VIEW_ALL,
    /** Acknowledge, work on and resolve incidents. */
    INCIDENT_HANDLE,
    INCIDENT_ASSIGN,
    INCIDENT_OVERRIDE_PRIORITY,
    WORKLOAD_VIEW,
    TEAM_VIEW,
    USER_MANAGE,
    CATALOG_MANAGE,
    SLA_MANAGE,
    CONFIG_MANAGE,
    REPORT_VIEW,
    AUDIT_VIEW,
    SLA_VIOLATION_VIEW
}
