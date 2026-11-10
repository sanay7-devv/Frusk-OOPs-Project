package com.iitsm.domain.assignment;

import java.util.Optional;
import java.util.Set;

import com.iitsm.domain.exception.ConflictOfInterestException;
import com.iitsm.domain.exception.TechnicianUnavailableException;
import com.iitsm.domain.exception.WorkloadExceededException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.user.Skill;
import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.domain.user.TechnicianRole;
import com.iitsm.domain.user.User;

/**
 * Decides whether a technician may receive an incident (handbook 1.7). All must hold: holds the TECHNICIAN role, is
 * not the reporter, the account is active, is AVAILABLE or BUSY, has load below max_load, and holds at least one
 * skill the category requires (an incident still in triage has no category, so no skill is required yet).
 * <p>
 * {@link #check} explains why someone is excluded (shown in recommendations); {@link #requireEligible} turns the
 * same answer into the matching error for manual assignment.
 */
public final class EligibilityFilter {

    /** Why a technician cannot take an incident. */
    public record Ineligibility(Kind kind, String reason) {
        public enum Kind { CONFLICT_OF_INTEREST, UNAVAILABLE, OVERLOADED }
    }

    private EligibilityFilter() {
    }

    public static boolean isEligible(User technician, Incident incident, int currentLoad) {
        return check(technician, incident, currentLoad).isEmpty();
    }

    /** Empty if eligible, otherwise the first rule that fails. Conflict of interest is checked first. */
    public static Optional<Ineligibility> check(User technician, Incident incident, int currentLoad) {
        if (incident.isReportedBy(technician.getId())) {
            return ineligible(Ineligibility.Kind.CONFLICT_OF_INTEREST, "reported this incident");
        }
        Optional<TechnicianRole> role = technician.technicianRole();
        if (role.isEmpty()) {
            return ineligible(Ineligibility.Kind.UNAVAILABLE, "does not hold the TECHNICIAN role");
        }
        TechnicianProfile profile = role.get().getProfile();
        if (!technician.isActive()) {
            return ineligible(Ineligibility.Kind.UNAVAILABLE, "the account is deactivated");
        }
        if (!profile.getAvailability().acceptsNewWork()) {
            return ineligible(Ineligibility.Kind.UNAVAILABLE, "is " + profile.getAvailability());
        }
        if (currentLoad >= profile.getMaxLoad()) {
            return ineligible(Ineligibility.Kind.OVERLOADED,
                    "at max load (" + currentLoad + "/" + profile.getMaxLoad() + ")");
        }
        if (incident.getCategory() != null) {
            Set<Skill> required = incident.getCategory().getRequiredSkills();
            if (!required.isEmpty() && !profile.getSkills().hasAny(required)) {
                return ineligible(Ineligibility.Kind.UNAVAILABLE, "has none of the skills this category needs");
            }
        }
        return Optional.empty();
    }

    /** Throws the specific error a manual assignment should report. */
    public static void requireEligible(User technician, Incident incident, int currentLoad) {
        check(technician, incident, currentLoad).ifPresent(problem -> {
            String name = technician.getName();
            throw switch (problem.kind()) {
                case CONFLICT_OF_INTEREST -> new ConflictOfInterestException(name);
                case OVERLOADED -> new WorkloadExceededException(name);
                case UNAVAILABLE -> new TechnicianUnavailableException(name, problem.reason());
            };
        });
    }

    private static Optional<Ineligibility> ineligible(Ineligibility.Kind kind, String reason) {
        return Optional.of(new Ineligibility(kind, reason));
    }
}
