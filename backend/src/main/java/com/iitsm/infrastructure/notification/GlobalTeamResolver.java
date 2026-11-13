package com.iitsm.infrastructure.notification;

import java.util.List;

import org.springframework.stereotype.Component;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.notification.NotificationRules;
import com.iitsm.domain.notification.TeamResolver;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.AdminScope;
import com.iitsm.domain.user.User;

/**
 * The one global team (decision DEC-26, DEC-42): every active team lead belongs to every incident's team. Must be
 * called inside a transaction, because it reads roles. A future per-service or per-department team means a new
 * implementation of {@link TeamResolver}, nothing else.
 */
@Component
public class GlobalTeamResolver implements TeamResolver {

    private final UserRepository users;

    public GlobalTeamResolver(UserRepository users) {
        this.users = users;
    }

    @Override
    public List<User> teamLeads(Incident incident) {
        return users.findAllTechnicians().stream()
                .filter(User::isActive)
                .filter(NotificationRules::isTeamLead)
                .toList();
    }

    @Override
    public List<User> escalationTargets(Incident incident, int level) {
        List<User> holders = switch (level) {
            case 1 -> teamLeads(incident);
            case 2 -> administrators(AdminScope.SYSTEM_ADMIN);
            case 3 -> administrators(AdminScope.IT_MANAGER);
            default -> List.of();
        };
        return holders.isEmpty() ? administrators(null) : holders;
    }

    /** Active administrators of one scope, or all of them for {@code null}. */
    private List<User> administrators(AdminScope scope) {
        return users.findAllAdministrators().stream()
                .filter(User::isActive)
                .filter(u -> scope == null
                        || u.administratorRole().map(r -> r.getProfile().getScope() == scope).orElse(false))
                .toList();
    }
}
