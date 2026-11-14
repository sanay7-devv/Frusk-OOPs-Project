package com.iitsm.domain.incident;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

import com.iitsm.domain.exception.InputValidationException;

/**
 * The statuses in which the work is still open and nobody has resolved it yet: CLASSIFIED, ASSIGNED, ACKNOWLEDGED,
 * IN_PROGRESS, PENDING_USER_INFO and REOPENED (State pattern, one level up). What is true of all of them lives here
 * once instead of six times: any open incident can be closed as a duplicate of another one (module M12).
 * <p>
 * Each subclass lists only its own moves in {@link #ownActions}; this class adds the ones every open status shares.
 */
abstract class OpenState extends IncidentState {

    /** The moves particular to this status. */
    abstract Set<IncidentAction> ownActions(Incident incident, Instant now, Duration reopenWindow);

    @Override
    public final Set<IncidentAction> legalActions(Incident incident, Instant now, Duration reopenWindow) {
        EnumSet<IncidentAction> legal = EnumSet.noneOf(IncidentAction.class);
        legal.addAll(ownActions(incident, now, reopenWindow));
        legal.add(IncidentAction.MARK_DUPLICATE);
        return legal;
    }

    /**
     * Closes the incident as a duplicate of {@code original}: the work continues on the original (API Data
     * Dictionary C.4 mark-duplicate). The original must be another incident that is not itself a closed duplicate,
     * so a chain of duplicates cannot form.
     */
    @Override
    void markDuplicate(Incident incident, Incident original, Instant now) {
        if (original == null) {
            throw new InputValidationException("duplicateOfId", "is required");
        }
        if (original == incident || (original.getId() != null && original.getId().equals(incident.getId()))) {
            throw new InputValidationException("duplicateOfId", "must be a different incident");
        }
        if (original.getClosureReason() == ClosureReason.DUPLICATE) {
            throw new InputValidationException("duplicateOfId",
                    original.getCode() + " is itself a duplicate; link to " + original.getDuplicateOf().getCode());
        }
        incident.setDuplicateOf(original);
        closeNow(incident, ClosureReason.DUPLICATE, now);
    }

    /**
     * The reporter withdraws the report before work has started (decision DEC-46, G3). Only CLASSIFIED, ASSIGNED
     * and ACKNOWLEDGED call this; once work has started the technician resolves it instead.
     */
    protected final void withdrawBeforeWork(Incident incident, String reason, Instant now) {
        requireText("reason", reason, 10, 1000);
        closeNow(incident, ClosureReason.WITHDRAWN, now);
    }

    /** Straight to CLOSED with the reason; both SLA clocks stop because CLOSED is past RESOLVED. */
    private static void closeNow(Incident incident, ClosureReason reason, Instant now) {
        incident.markClosed(reason, now);
        incident.moveTo(IncidentStatus.CLOSED, now);
    }
}
