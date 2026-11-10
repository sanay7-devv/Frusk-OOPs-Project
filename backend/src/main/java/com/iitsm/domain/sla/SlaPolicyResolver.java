package com.iitsm.domain.sla;

import com.iitsm.domain.exception.SlaNotConfiguredException;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.repository.SlaPolicyRepository;
import com.iitsm.domain.service.ItService;

/**
 * Finds the SLA that applies to an incident (handbook 2.5 M3): first a policy for the service and priority, then the
 * global default for the priority. If neither exists, the error names exactly which service and priority are
 * missing a policy, so an administrator can fix the configuration.
 */
public class SlaPolicyResolver {

    private final SlaPolicyRepository policies;

    public SlaPolicyResolver(SlaPolicyRepository policies) {
        this.policies = policies;
    }

    public SlaPolicy resolve(ItService service, Priority priority) {
        return policies.findByService_IdAndPriority(service.getId(), priority)
                .or(() -> policies.findByServiceIsNullAndPriority(priority))
                .orElseThrow(() -> new SlaNotConfiguredException(service.getName(), priority.name()));
    }
}
