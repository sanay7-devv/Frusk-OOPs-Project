package com.iitsm.domain.assignment;

import java.util.Set;

import com.iitsm.domain.exception.ConflictOfInterestException;
import com.iitsm.domain.exception.TechnicianUnavailableException;
import com.iitsm.domain.exception.WorkloadExceededException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.user.Skill;
import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.domain.user.User;

/**
 * Decides whether a technician may receive an incident (handbook 1.7). All must hold: holds the TECHNICIAN role, is
 * not the reporter, is AVAILABLE or BUSY, has load below max_load, and holds at least one skill the category
 * requires (an incident still in triage has no category, so no skill is required yet).
 * Manual assignment uses {@link #requireEligible}; the assignment strategies (M6) use {@link #isEligible}.
 */
public final class EligibilityFilter {

    private EligibilityFilter() {
    }

    public static boolean isEligible(User technician, Incident incident, int currentLoad) {
        try {
            requireEligible(technician, incident, currentLoad);
            return true;
        } catch (ConflictOfInterestException | TechnicianUnavailableException | WorkloadExceededException ex) {
            return false;
        }
    }

    /** Throws the specific reason a technician cannot take the incident. Conflict of interest is checked first. */
    public static void requireEligible(User technician, Incident incident, int currentLoad) {
        String name = technician.getName();
        if (incident.isReportedBy(technician.getId())) {
            throw new ConflictOfInterestException(name);
        }
        TechnicianProfile profile = technician.technicianRole()
                .orElseThrow(() -> new TechnicianUnavailableException(name, "does not hold the TECHNICIAN role"))
                .getProfile();
        if (!technician.isActive()) {
            throw new TechnicianUnavailableException(name, "the account is deactivated");
        }
        if (!profile.getAvailability().acceptsNewWork()) {
            throw new TechnicianUnavailableException(name, "is " + profile.getAvailability());
        }
        if (currentLoad >= profile.getMaxLoad()) {
            throw new WorkloadExceededException(name);
        }
        if (incident.getCategory() != null) {
            Set<Skill> required = incident.getCategory().getRequiredSkills();
            if (!required.isEmpty() && !profile.getSkills().hasAny(required)) {
                throw new TechnicianUnavailableException(name, "has none of the skills this category needs");
            }
        }
    }
}
