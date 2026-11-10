package com.iitsm.domain.assignment;

import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.domain.user.User;

/**
 * A technician as the assignment strategies see them: the person, their profile and two facts looked up for this
 * incident (current weighted load, and how many incidents on the same service they resolved recently).
 */
public record TechnicianCandidate(User technician, TechnicianProfile profile, int currentLoad,
                                  long recentServiceFixes) {
}
