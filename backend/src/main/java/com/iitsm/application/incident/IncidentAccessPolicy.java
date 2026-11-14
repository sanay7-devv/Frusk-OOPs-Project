package com.iitsm.application.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.domain.exception.UnauthorizedOperationException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.user.PermissionKey;

/**
 * Who may do what to an incident (handbook 1.9 permission matrix, API contract B.1 visibility). The State pattern
 * decides whether a move is legal in the current status; this class decides whether the caller may make it.
 * Both together give allowedActions, so the frontend never re-implements the rules.
 * <p>
 * Team leads see every incident: the schema has no team concept, so "team" is the whole support organization.
 */
@Component
public class IncidentAccessPolicy {

    /** Reporter, assignee, team lead or admin. Everyone else gets INCIDENT_NOT_FOUND on read endpoints. */
    public boolean canView(AuthenticatedUser caller, Incident incident) {
        return incident.isReportedBy(caller.id())
                || incident.isAssignedTo(caller.id())
                || caller.can(PermissionKey.INCIDENT_VIEW_ALL)
                || caller.can(PermissionKey.INCIDENT_VIEW_TEAM);
    }

    /** True if the caller sees every incident in lists, not only their own. */
    public boolean seesAll(AuthenticatedUser caller) {
        return caller.can(PermissionKey.INCIDENT_VIEW_ALL) || caller.can(PermissionKey.INCIDENT_VIEW_TEAM);
    }

    /** Whether the caller's role and relation to the incident allow the action (ignores the status). */
    public boolean permits(AuthenticatedUser caller, Incident incident, IncidentAction action) {
        boolean reporter = incident.isReportedBy(caller.id());
        boolean assignee = incident.isAssignedTo(caller.id());
        boolean admin = caller.can(PermissionKey.INCIDENT_VIEW_ALL);
        // Only "who" is decided here. A status that forbids the action is the domain's answer: 409, never 403.
        return switch (action) {
            // a team lead edits too: once the incident is assigned only staff may change what drives the priority (G4)
            case EDIT -> reporter || admin || caller.can(PermissionKey.INCIDENT_VIEW_TEAM);
            case COMMENT -> canView(caller, incident);
            case ASSIGN, REASSIGN -> caller.can(PermissionKey.INCIDENT_ASSIGN);
            case ACKNOWLEDGE, START_WORK, REQUEST_INFO, RESOLVE ->
                    assignee && caller.can(PermissionKey.INCIDENT_HANDLE);
            case PROVIDE_INFO, VERIFY -> reporter;
            case CLOSE -> admin;
            case REOPEN -> reporter || admin;
            case OVERRIDE_PRIORITY -> caller.can(PermissionKey.INCIDENT_OVERRIDE_PRIORITY);
            // only the reporter rates the work; "once it is resolved" is the status rule, checked by FeedbackService
            case GIVE_FEEDBACK -> reporter;
            // the assignee, a team lead (INCIDENT_VIEW_TEAM) or an administrator (API Data Dictionary C.5)
            case ESCALATE -> (assignee && caller.can(PermissionKey.INCIDENT_HANDLE))
                    || caller.can(PermissionKey.INCIDENT_VIEW_TEAM) || admin;
            // an administrator or a team lead (API Data Dictionary C.4)
            case MARK_DUPLICATE -> caller.can(PermissionKey.INCIDENT_ASSIGN);
            // only the person who reported it takes it back (G3)
            case WITHDRAW -> reporter;
        };
    }

    /**
     * Impact, urgency and affected users drive the priority. Before assignment the reporter may correct them; from
     * ASSIGNED on only a team lead or an administrator may change them, so a reporter cannot raise their own priority
     * (decision DEC-46, G4). The description stays editable for the reporter. Wrong person, so 403.
     */
    public void requirePriorityInputEdit(AuthenticatedUser caller, Incident incident) {
        boolean beforeAssignment = incident.getStatus() == IncidentStatus.NEW
                || incident.getStatus() == IncidentStatus.CLASSIFIED;
        boolean staff = caller.can(PermissionKey.INCIDENT_VIEW_ALL) || caller.can(PermissionKey.INCIDENT_VIEW_TEAM);
        if (!beforeAssignment && !staff) {
            throw new UnauthorizedOperationException("Once " + incident.getCode()
                    + " is assigned, only a team lead or an administrator may change impact, urgency or affected users.");
        }
    }

    /** Throws 403 UNAUTHORIZED_OPERATION if the caller may not perform the action. */
    public void require(AuthenticatedUser caller, Incident incident, IncidentAction action) {
        if (!permits(caller, incident, action)) {
            throw new UnauthorizedOperationException(
                    "Your role or relation to " + incident.getCode() + " does not allow " + action + ".");
        }
    }

    /** The actions the caller can perform right now: legal in the status and permitted for the caller. */
    public Set<IncidentAction> allowedActions(AuthenticatedUser caller, Incident incident, Instant now,
                                              Duration reopenWindow) {
        EnumSet<IncidentAction> allowed = EnumSet.noneOf(IncidentAction.class);
        for (IncidentAction action : incident.legalTransitions(now, reopenWindow)) {
            if (permits(caller, incident, action)) {
                allowed.add(action);
            }
        }
        boolean open = !incident.getStatus().isResolvedOrLater();
        if (incident.getStatus().isEditable() && permits(caller, incident, IncidentAction.EDIT)) {
            allowed.add(IncidentAction.EDIT);
        }
        if (permits(caller, incident, IncidentAction.COMMENT)) {
            allowed.add(IncidentAction.COMMENT);
        }
        if (open && permits(caller, incident, IncidentAction.OVERRIDE_PRIORITY)) {
            allowed.add(IncidentAction.OVERRIDE_PRIORITY);
        }
        return allowed;
    }
}
