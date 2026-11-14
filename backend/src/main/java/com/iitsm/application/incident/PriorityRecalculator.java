package com.iitsm.application.incident;

import java.time.Clock;

import org.springframework.stereotype.Component;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.category.Category;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.priority.PriorityBreakdown;
import com.iitsm.domain.priority.PriorityEngine;
import com.iitsm.domain.priority.PriorityInput;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.sla.SlaPolicy;
import com.iitsm.domain.sla.SlaPolicyResolver;

/**
 * Runs the priority engine for an incident with the live settings and applies the result together with the SLA
 * targets of the resolved policy (service policy, else global default, else SLA_NOT_CONFIGURED). Shared by the
 * incident service (create, edit) and the known-outage join, which raises the affected users of the lead incident
 * (Major Incident Mode, DEC-73).
 */
@Component
public class PriorityRecalculator {

    private final PriorityEngine engine;
    private final SlaPolicyResolver slaPolicies;
    private final ConfigService config;
    private final Clock clock;

    public PriorityRecalculator(PriorityEngine engine, SlaPolicyResolver slaPolicies, ConfigService config,
                                Clock clock) {
        this.engine = engine;
        this.slaPolicies = slaPolicies;
        this.config = config;
        this.clock = clock;
    }

    public void recalculate(Incident incident) {
        ItService service = incident.getService();
        AppSettings settings = config.current();
        PriorityInput input = new PriorityInput(incident.getImpact(), incident.getUrgency(),
                service.getCriticality(), incident.getAffectedUsers(), service.getName(), service.isAlwaysP1(),
                isSecurity(incident.getCategory(), settings));
        PriorityBreakdown breakdown = engine.calculate(input, settings);
        SlaPolicy policy = slaPolicies.resolve(service, breakdown.band());
        incident.applyPriority(breakdown, policy.targets(settings), clock.instant());
    }

    /**
     * Override rule 1: the category is the security category named in {@code priority.security.category} or sits
     * under it (for example Phishing under Security). A setting, not a name in the code (decision DEC-46, C3).
     */
    private static boolean isSecurity(Category category, AppSettings settings) {
        return category != null && category.isWithin(settings.raw(ConfigKey.PRIORITY_SECURITY_CATEGORY));
    }
}
