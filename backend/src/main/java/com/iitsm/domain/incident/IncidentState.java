package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.iitsm.domain.sla.WorkCalendar;
import com.iitsm.domain.sla.SlaTargets;
import com.iitsm.domain.category.Category;
import com.iitsm.domain.exception.ConflictOfInterestException;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.InvalidStateTransitionException;
import com.iitsm.domain.user.User;

/**
 * State pattern: one subclass per incident status (handbook 1.8). Every action is declared here with a default that
 * refuses it with InvalidStateTransitionException naming the current status and the attempted action. Each concrete
 * state overrides only the moves it allows, so "NEW straight to CLOSED" is impossible by construction.
 * <p>
 * States are stateless singletons handed out by {@link StateFactory}; they change the incident only through its
 * package-private mutators.
 */
public abstract class IncidentState {

    public abstract IncidentStatus status();

    /** The transitions this state allows right now (the access policy then filters by who is asking). */
    public Set<IncidentAction> legalActions(Incident incident, Instant now, Duration reopenWindow) {
        return Set.of();
    }

    void classify(Incident incident, Category category, Instant now) {
        throw new InvalidStateTransitionException(status().name(), "CLASSIFY");
    }

    void assign(Incident incident, User technician, Instant now) {
        throw refused(IncidentAction.ASSIGN);
    }

    void acknowledge(Incident incident, Instant now) {
        throw refused(IncidentAction.ACKNOWLEDGE);
    }

    void startWork(Incident incident, Instant now) {
        throw refused(IncidentAction.START_WORK);
    }

    void requestInfo(Incident incident, String message, Instant now) {
        throw refused(IncidentAction.REQUEST_INFO);
    }

    void provideInfo(Incident incident, String message, Instant now, WorkCalendar calendar) {
        throw refused(IncidentAction.PROVIDE_INFO);
    }

    void resolve(Incident incident, Resolution resolution, Instant now) {
        throw refused(IncidentAction.RESOLVE);
    }

    void verify(Incident incident, Instant now) {
        throw refused(IncidentAction.VERIFY);
    }

    void close(Incident incident, ClosureReason reason, Instant now) {
        throw refused(IncidentAction.CLOSE);
    }

    void reopen(Incident incident, String reason, Instant now, Duration reopenWindow, SlaTargets targets) {
        throw refused(IncidentAction.REOPEN);
    }

    void reassign(Incident incident, User technician, Instant now) {
        throw refused(IncidentAction.REASSIGN);
    }

    /** The reporter withdraws the report (G3); CLASSIFIED, ASSIGNED and ACKNOWLEDGED allow it. */
    void withdraw(Incident incident, String reason, Instant now) {
        throw refused(IncidentAction.WITHDRAW);
    }

    /** Closes the incident as a duplicate of another one; every open status allows it ({@link OpenState}). */
    void markDuplicate(Incident incident, Incident original, Instant now) {
        throw refused(IncidentAction.MARK_DUPLICATE);
    }

    /** Manual escalation by a person; only the states that allow it override this. */
    void escalate(Incident incident, Instant now) {
        throw refused(IncidentAction.ESCALATE);
    }

    /** Escalation by the monitor: allowed exactly while {@link #isUnattended} is true. */
    void escalateUnattended(Incident incident, Instant now) {
        if (!isUnattended(incident)) {
            throw refused(IncidentAction.ESCALATE);
        }
        raiseLevel(incident, now);
    }

    /** Whether nobody has acknowledged the incident yet, so the escalation monitor still watches it. */
    boolean isUnattended(Incident incident) {
        return false;
    }

    // ------------------------------------------------------------------ shared helpers for the subclasses

    protected final InvalidStateTransitionException refused(IncidentAction action) {
        return new InvalidStateTransitionException(status().name(), action.name());
    }

    /** Shared by assign and reassign: a technician must be given, and never the reporter (conflict of interest). */
    protected static void giveTo(Incident incident, User technician) {
        if (technician == null) {
            throw new InputValidationException("technicianId", "is required");
        }
        if (incident.isReportedBy(technician.getId())) {
            throw new ConflictOfInterestException(technician.getName());
        }
        incident.setAssignee(technician);
    }

    /** One step up the chain; the chain ends at level 3. */
    protected final void raiseLevel(Incident incident, Instant now) {
        if (incident.getEscalationLevel() >= 3) {
            throw new InvalidStateTransitionException(status().name(), IncidentAction.ESCALATE.name(),
                    "the incident is already at the highest escalation level (3)");
        }
        incident.raiseEscalationLevel(now);
    }

    /** ESCALATE joins the legal actions of the states that allow it, until level 3 is reached. */
    protected static Set<IncidentAction> withEscalate(Incident incident, IncidentAction... actions) {
        java.util.EnumSet<IncidentAction> legal = java.util.EnumSet.noneOf(IncidentAction.class);
        legal.addAll(java.util.List.of(actions));
        if (incident.getEscalationLevel() < 3) {
            legal.add(IncidentAction.ESCALATE);
        }
        return legal;
    }

    protected static void requireText(String field, String value, int min, int max) {
        int length = value == null ? 0 : value.strip().length();
        if (length < min || length > max) {
            throw new InputValidationException(field, "must be between " + min + " and " + max + " characters");
        }
    }
}
