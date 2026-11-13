package com.iitsm.application.escalation;

import java.util.List;

import org.springframework.stereotype.Component;

import com.iitsm.domain.escalation.EscalationTarget;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.AdminScope;
import com.iitsm.domain.user.User;

/**
 * Who sits at each level of the chain (handbook 2.5 M11): the team lead is a technician with escalation level 1; the
 * system administrator and the IT manager are administrators by scope. Every active holder of a level is a
 * recipient; a level nobody holds returns an empty list and is passed over (DEC-42).
 */
@Component
public class EscalationRecipients {

    private final UserRepository users;

    public EscalationRecipients(UserRepository users) {
        this.users = users;
    }

    /** The active people at a level. Level 0 is the assigned technician and has no standing holders. */
    public List<User> holdersOf(EscalationTarget target) {
        return switch (target) {
            case TECHNICIAN -> List.of();
            case TEAM_LEAD -> users.findAllTechnicians().stream()
                    .filter(User::isActive)
                    .filter(u -> u.technicianRole().map(r -> r.getProfile().isTeamLead()).orElse(false))
                    .toList();
            case SYSTEM_ADMIN -> administrators(AdminScope.SYSTEM_ADMIN);
            case IT_MANAGER -> administrators(AdminScope.IT_MANAGER);
        };
    }

    /** Every active administrator, whatever the scope (the exhausted alert, DEC-49). */
    public List<User> administrators() {
        return users.findAllAdministrators().stream().filter(User::isActive).toList();
    }

    private List<User> administrators(AdminScope scope) {
        return users.findAllAdministrators().stream()
                .filter(User::isActive)
                .filter(u -> u.administratorRole().map(r -> r.getProfile().getScope() == scope).orElse(false))
                .toList();
    }
}
