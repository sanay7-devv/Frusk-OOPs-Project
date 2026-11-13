package com.iitsm.domain.notification;

import java.util.List;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.user.User;

/**
 * Who leads the team around an incident. The schema has no team concept, so today there is one global pool (decision
 * DEC-26, DEC-42); the interface lets a later version answer per service or department without touching the
 * notification rules.
 */
public interface TeamResolver {

    /** Active team leads (technicians with escalation level 1) who hear about this incident. */
    List<User> teamLeads(Incident incident);

    /**
     * The people an incident goes to when raised to {@code level}: 1 team leads, 2 system administrators,
     * 3 IT managers. If nobody holds the level, every active administrator, so an escalation is never lost.
     */
    List<User> escalationTargets(Incident incident, int level);
}
