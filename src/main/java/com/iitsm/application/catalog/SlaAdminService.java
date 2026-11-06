package com.iitsm.application.catalog;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.catalog.CatalogViews.EscalationPolicyView;
import com.iitsm.application.catalog.CatalogViews.SlaPolicyView;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.ResourceNotFoundException;
import com.iitsm.domain.exception.ServiceNotFoundException;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.repository.EscalationPolicyRepository;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.repository.SlaPolicyRepository;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.sla.CalendarType;
import com.iitsm.domain.sla.EscalationPolicy;
import com.iitsm.domain.sla.SlaPolicy;

/**
 * Module M3 SLA configuration: SLA policies (global defaults and per-service overrides, one per service and
 * priority) and escalation policies (levels 1 to 3 per priority, without gaps).
 */
@Service
public class SlaAdminService {

    /** Global defaults first, then by service name and priority. */
    private static final Comparator<SlaPolicyView> SLA_ORDER = Comparator
            .comparing((SlaPolicyView v) -> v.serviceName() == null ? "" : v.serviceName(),
                    String.CASE_INSENSITIVE_ORDER)
            .thenComparing(SlaPolicyView::priority);

    private final SlaPolicyRepository slaPolicies;
    private final EscalationPolicyRepository escalationPolicies;
    private final ItServiceRepository services;

    public SlaAdminService(SlaPolicyRepository slaPolicies, EscalationPolicyRepository escalationPolicies,
                           ItServiceRepository services) {
        this.slaPolicies = slaPolicies;
        this.escalationPolicies = escalationPolicies;
        this.services = services;
    }

    // ------------------------------------------------------------------ SLA policies

    @Transactional(readOnly = true)
    public List<SlaPolicyView> allSlaPolicies() {
        return slaPolicies.findAll().stream().map(SlaPolicyView::of).sorted(SLA_ORDER).toList();
    }

    @Transactional
    public SlaPolicyView createSlaPolicy(Long serviceId, Priority priority, int responseMinutes,
                                         int resolutionMinutes, CalendarType calendarType) {
        ItService service = serviceId == null ? null : loadService(serviceId);
        requireNoOtherSlaPolicy(service, priority, null);
        SlaPolicy policy = new SlaPolicy(service, priority, responseMinutes, resolutionMinutes,
                calendarType == null ? CalendarType.ALWAYS : calendarType);
        return SlaPolicyView.of(slaPolicies.save(policy));
    }

    /** Changes the targets. Service and priority identify the policy and stay fixed (delete and recreate instead). */
    @Transactional
    public SlaPolicyView updateSlaPolicy(Long id, Long serviceId, Priority priority, int responseMinutes,
                                         int resolutionMinutes, CalendarType calendarType) {
        SlaPolicy policy = loadSlaPolicy(id);
        Long currentServiceId = policy.isGlobalDefault() ? null : policy.getService().getId();
        if (!Objects.equals(currentServiceId, serviceId)) {
            throw new InputValidationException("serviceId", "cannot be changed; delete and recreate the policy");
        }
        if (policy.getPriority() != priority) {
            throw new InputValidationException("priority", "cannot be changed; delete and recreate the policy");
        }
        policy.changeTargets(responseMinutes, resolutionMinutes,
                calendarType == null ? CalendarType.ALWAYS : calendarType);
        return SlaPolicyView.of(policy);
    }

    @Transactional
    public void deleteSlaPolicy(Long id) {
        slaPolicies.delete(loadSlaPolicy(id));
    }

    /**
     * One policy per service and priority. Checked here as well as by the unique constraint, because the
     * database treats two NULL service ids as different, so it would allow two global defaults for one priority.
     */
    private void requireNoOtherSlaPolicy(ItService service, Priority priority, Long exceptId) {
        Optional<SlaPolicy> existing = service == null
                ? slaPolicies.findByServiceIsNullAndPriority(priority)
                : slaPolicies.findByService_IdAndPriority(service.getId(), priority);
        if (existing.isPresent() && !existing.get().getId().equals(exceptId)) {
            throw new InputValidationException("priority", service == null
                    ? "a global default for " + priority + " already exists"
                    : "a policy for " + service.getName() + " and " + priority + " already exists");
        }
    }

    // ------------------------------------------------------------------ escalation policies

    @Transactional(readOnly = true)
    public List<EscalationPolicyView> allEscalationPolicies() {
        return escalationPolicies.findAllByOrderByPriorityAscLevelAsc().stream()
                .map(EscalationPolicyView::of)
                .toList();
    }

    /** Levels are added in order: level 2 needs level 1, level 3 needs level 2 (no gaps). */
    @Transactional
    public EscalationPolicyView createEscalationPolicy(Priority priority, int level, int timeoutMinutes) {
        EscalationPolicy policy = new EscalationPolicy(priority, level, timeoutMinutes);
        if (escalationPolicies.existsByPriorityAndLevel(priority, (short) level)) {
            throw new InputValidationException("level", "level " + level + " for " + priority + " already exists");
        }
        if (level > 1 && !escalationPolicies.existsByPriorityAndLevel(priority, (short) (level - 1))) {
            throw new InputValidationException("level", "add level " + (level - 1) + " for " + priority + " first");
        }
        return EscalationPolicyView.of(escalationPolicies.save(policy));
    }

    /** Changes the timeout. Priority and level identify the policy and stay fixed. */
    @Transactional
    public EscalationPolicyView updateEscalationPolicy(Long id, Priority priority, int level, int timeoutMinutes) {
        EscalationPolicy policy = loadEscalationPolicy(id);
        if (policy.getPriority() != priority || policy.getLevel() != level) {
            throw new InputValidationException("level", "priority and level cannot be changed; delete and recreate");
        }
        policy.changeTimeout(timeoutMinutes);
        return EscalationPolicyView.of(policy);
    }

    /** Only the highest level of a priority can be removed, so no gap appears. */
    @Transactional
    public void deleteEscalationPolicy(Long id) {
        EscalationPolicy policy = loadEscalationPolicy(id);
        if (escalationPolicies.existsByPriorityAndLevel(policy.getPriority(), (short) (policy.getLevel() + 1))) {
            throw new InputValidationException("level",
                    "remove level " + (policy.getLevel() + 1) + " for " + policy.getPriority() + " first");
        }
        escalationPolicies.delete(policy);
    }

    // ------------------------------------------------------------------ helpers

    private ItService loadService(Long id) {
        return services.findById(id).orElseThrow(() -> new ServiceNotFoundException(id));
    }

    private SlaPolicy loadSlaPolicy(Long id) {
        return slaPolicies.findById(id).orElseThrow(() -> new ResourceNotFoundException("SLA policy", id));
    }

    private EscalationPolicy loadEscalationPolicy(Long id) {
        return escalationPolicies.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Escalation policy", id));
    }
}
