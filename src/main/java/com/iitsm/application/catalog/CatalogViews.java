package com.iitsm.application.catalog;

import java.util.Comparator;
import java.util.List;

import com.iitsm.domain.category.Category;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.sla.CalendarType;
import com.iitsm.domain.sla.EscalationPolicy;
import com.iitsm.domain.sla.SlaPolicy;
import com.iitsm.domain.user.Skill;

/**
 * Read-only snapshots of catalog items (API Data Dictionary C.9), built inside the transaction so controllers never
 * touch entities. Id lists are sorted so responses are stable.
 */
public final class CatalogViews {

    private CatalogViews() {
    }

    /** GET /services item. */
    public record ServiceSummary(Long id, String name, int criticality) {
        static ServiceSummary of(ItService s) {
            return new ServiceSummary(s.getId(), s.getName(), s.getCriticality());
        }
    }

    /** ServiceAdmin. */
    public record ServiceView(Long id, String name, String owner, int criticality, boolean alwaysP1,
                              String description, boolean active, List<Long> dependencyIds) {
        static ServiceView of(ItService s) {
            return new ServiceView(s.getId(), s.getName(), s.getOwner(), s.getCriticality(), s.isAlwaysP1(),
                    s.getDescription(), s.isActive(),
                    s.getDependencies().stream().map(ItService::getId).sorted().toList());
        }
    }

    /** CategoryAdmin. */
    public record CategoryView(Long id, String name, Long parentId, boolean active, List<Long> requiredSkillIds) {
        static CategoryView of(Category c) {
            return new CategoryView(c.getId(), c.getName(), c.getParent() == null ? null : c.getParent().getId(),
                    c.isActive(), c.getRequiredSkills().stream().map(Skill::getId).sorted().toList());
        }
    }

    /** GET /categories: active categories as a tree. */
    public record CategoryNode(Long id, String name, List<CategoryNode> children) {
    }

    /** Skill. */
    public record SkillView(Long id, String name) {
        static SkillView of(Skill s) {
            return new SkillView(s.getId(), s.getName());
        }

        static final Comparator<SkillView> BY_NAME = Comparator.comparing(SkillView::name, String.CASE_INSENSITIVE_ORDER);
    }

    /** SlaPolicy. serviceId and serviceName are null for a global default. */
    public record SlaPolicyView(Long id, Long serviceId, String serviceName, Priority priority, int responseMinutes,
                                int resolutionMinutes, CalendarType calendarType) {
        static SlaPolicyView of(SlaPolicy p) {
            ItService service = p.getService();
            return new SlaPolicyView(p.getId(), service == null ? null : service.getId(),
                    service == null ? null : service.getName(), p.getPriority(), p.getResponseMinutes(),
                    p.getResolutionMinutes(), p.getCalendarType());
        }
    }

    /** EscalationPolicy. */
    public record EscalationPolicyView(Long id, Priority priority, int level, int timeoutMinutes) {
        static EscalationPolicyView of(EscalationPolicy p) {
            return new EscalationPolicyView(p.getId(), p.getPriority(), p.getLevel(), p.getTimeoutMinutes());
        }
    }
}
