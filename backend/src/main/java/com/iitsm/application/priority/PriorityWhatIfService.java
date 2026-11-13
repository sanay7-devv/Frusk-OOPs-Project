package com.iitsm.application.priority;

import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentAccessPolicy;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.domain.category.Category;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.exception.IncidentNotFoundException;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.ResourceNotFoundException;
import com.iitsm.domain.exception.ServiceNotFoundException;
import com.iitsm.domain.exception.SlaNotConfiguredException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.priority.PriorityBreakdown;
import com.iitsm.domain.priority.PriorityEngine;
import com.iitsm.domain.priority.PriorityInput;
import com.iitsm.domain.repository.CategoryRepository;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.sla.SlaPolicyResolver;
import com.iitsm.domain.sla.SlaTargets;

/**
 * Priority what-if (addition A11, decision DEC-66): which priority and score the live {@link PriorityEngine} would
 * give for other impact, urgency and affected-users values, for an existing incident or for raw input. Read-only:
 * nothing is saved, audited or recalculated. The formula is not repeated here; the engine is called with the live
 * settings, so the answer always matches what a real incident would get.
 */
@Service
public class PriorityWhatIfService {

    /** One scenario: the inputs, the engine's result, and the SLA targets of the resulting priority. */
    public record Scenario(int impact, int urgency, int affectedUsers, int score, Priority priority,
                           PriorityBreakdown breakdown, Integer slaResponseMinutes, Integer slaResolutionMinutes) {
    }

    /**
     * @param incident null in raw-input mode
     * @param current  what the incident has now (stored priority and score), null in raw-input mode
     * @param whatIf   the engine's answer for the requested values
     * @param changed  the priority band differs from the stored one
     */
    public record WhatIfView(Ref incident, String incidentCode, Ref service, Ref category, Scenario current,
                             Scenario whatIf, boolean changed, Integer scoreDifference) {
    }

    private final PriorityEngine engine;
    private final ConfigService config;
    private final IncidentRepository incidents;
    private final ItServiceRepository services;
    private final CategoryRepository categories;
    private final SlaPolicyResolver slaPolicies;
    private final IncidentAccessPolicy access;

    public PriorityWhatIfService(PriorityEngine engine, ConfigService config, IncidentRepository incidents,
                                 ItServiceRepository services, CategoryRepository categories,
                                 SlaPolicyResolver slaPolicies, IncidentAccessPolicy access) {
        this.engine = engine;
        this.config = config;
        this.incidents = incidents;
        this.services = services;
        this.categories = categories;
        this.slaPolicies = slaPolicies;
        this.access = access;
    }

    /**
     * @param incidentId set: service and category come from that incident (the caller must see it) and the
     *                   current priority is shown for comparison; null: serviceId is required, categoryId optional
     */
    @Transactional(readOnly = true)
    public WhatIfView whatIf(AuthenticatedUser caller, Long incidentId, Long serviceId, Long categoryId,
                             int impact, int urgency, int affectedUsers) {
        AppSettings settings = config.current();
        Incident incident = null;
        ItService service;
        Category category;
        if (incidentId != null) {
            incident = incidents.findById(incidentId).filter(i -> access.canView(caller, i))
                    .orElseThrow(() -> new IncidentNotFoundException(incidentId));
            service = incident.getService();
            category = incident.getCategory();
        } else {
            if (serviceId == null) {
                throw new InputValidationException("serviceId", "is required when no incidentId is given");
            }
            service = services.findById(serviceId).orElseThrow(() -> new ServiceNotFoundException(serviceId));
            category = categoryId == null ? null
                    : categories.findById(categoryId).orElseThrow(() -> new ResourceNotFoundException("Category", categoryId));
        }
        PriorityInput input = new PriorityInput(impact, urgency, service.getCriticality(), affectedUsers,
                service.getName(), service.isAlwaysP1(), isSecurity(category));
        PriorityBreakdown result = engine.calculate(input, settings);
        Scenario whatIf = scenario(service, impact, urgency, affectedUsers, result, settings);

        Scenario current = null;
        if (incident != null && incident.getPriorityBreakdown() != null) {
            PriorityBreakdown stored = incident.getPriorityBreakdown();
            current = scenario(service, incident.getImpact(), incident.getUrgency(), incident.getAffectedUsers(),
                    new PriorityBreakdown(stored.impact(), stored.urgency(), stored.criticality(),
                            stored.usersMultiplier(), stored.baseScore(), stored.score(), incident.getPriority(),
                            stored.overrideRule()), settings);
        }
        boolean changed = current != null && current.priority() != whatIf.priority();
        return new WhatIfView(incident == null ? null : new Ref(incident.getId(), incident.getCode()),
                incident == null ? null : incident.getCode(), new Ref(service.getId(), service.getName()),
                category == null ? null : new Ref(category.getId(), category.getName()), current, whatIf, changed,
                current == null ? null : whatIf.score() - current.score());
    }

    private Scenario scenario(ItService service, int impact, int urgency, int users, PriorityBreakdown b,
                              AppSettings settings) {
        Integer response = null;
        Integer resolution = null;
        try {
            SlaTargets targets = slaPolicies.resolve(service, b.band()).targets(settings);
            response = (int) targets.response().toMinutes();
            resolution = (int) targets.resolution().toMinutes();
        } catch (SlaNotConfiguredException ex) {
            // no policy for this priority: the SLA part stays empty, the priority answer is still valid
        }
        return new Scenario(impact, urgency, users, b.score(), b.band(), b, response, resolution);
    }

    /** Same rule as the incident pipeline (the category is Security or sits under it); C3 will replace both. */
    private static boolean isSecurity(Category category) {
        for (Category c = category; c != null; c = c.getParent()) {
            if (c.getName().toLowerCase(Locale.ROOT).equals("security")) {
                return true;
            }
        }
        return false;
    }
}
