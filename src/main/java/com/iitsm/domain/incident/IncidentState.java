package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

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

    void provideInfo(Incident incident, String message, Instant now) {
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

    void reopen(Incident incident, String reason, Instant now, Duration reopenWindow, Duration resolutionTarget) {
        throw refused(IncidentAction.REOPEN);
    }

    void reassign(Incident incident, User technician, Instant now) {
        throw refused(IncidentAction.REASSIGN);
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

    protected static void requireText(String field, String value, int min, int max) {
        int length = value == null ? 0 : value.strip().length();
        if (length < min || length > max) {
            throw new InputValidationException(field, "must be between " + min + " and " + max + " characters");
        }
    }
}
