package com.iitsm.application.report;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.application.report.ReportViews.CoverageItem;
import com.iitsm.application.report.ReportViews.CoverageLevel;
import com.iitsm.application.report.ReportViews.CoverageRiskReport;
import com.iitsm.application.report.ReportViews.SkillCoverage;
import com.iitsm.domain.category.Category;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.report.ReportRows.ServiceCategoryUse;
import com.iitsm.domain.repository.CategoryRepository;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.repository.ReportRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.user.Skill;
import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.domain.user.User;

/**
 * E3 coverage risk report (decision DEC-47, DEC-63). A service has no category of its own, so the pairs come from
 * history: every service and category seen together on incidents in the last N days. For each pair the report counts
 * the technicians the assignment engine would accept (active account, AVAILABLE or BUSY, holding at least one skill
 * the category requires; any technician if it requires none) and flags the pair when the service is critical and
 * fewer than the minimum can take its incidents. The thresholds are settings.
 */
@Service
public class CoverageRiskService {

    private final ReportRepository reports;
    private final UserRepository users;
    private final ItServiceRepository services;
    private final CategoryRepository categories;
    private final ConfigService config;
    private final Clock clock;

    public CoverageRiskService(ReportRepository reports, UserRepository users, ItServiceRepository services,
                               CategoryRepository categories, ConfigService config, Clock clock) {
        this.reports = reports;
        this.users = users;
        this.services = services;
        this.categories = categories;
        this.config = config;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CoverageRiskReport report(boolean onlyFlagged) {
        AppSettings settings = config.current();
        int windowDays = settings.intValue(ConfigKey.COVERAGE_WINDOW_DAYS);
        int minCriticality = settings.intValue(ConfigKey.COVERAGE_MIN_CRITICALITY);
        int minHolders = settings.intValue(ConfigKey.COVERAGE_MIN_HOLDERS);
        Instant now = clock.instant();

        List<User> available = users.findAllTechnicians().stream()
                .filter(User::isActive)
                .filter(u -> u.technicianRole().map(r -> r.getProfile().getAvailability().acceptsNewWork()).orElse(false))
                .toList();
        List<ServiceCategoryUse> uses = reports.serviceCategoryUse(now.minus(Duration.ofDays(windowDays)));
        Map<Long, ItService> serviceById = services.findAllByOrderByNameAsc().stream()
                .collect(Collectors.toMap(ItService::getId, Function.identity()));
        Map<Long, Category> categoryById = categories.findAllByOrderByNameAsc().stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));

        List<CoverageItem> items = new ArrayList<>();
        for (ServiceCategoryUse use : uses) {
            ItService service = serviceById.get(use.serviceId());
            Category category = categoryById.get(use.categoryId());
            if (service == null || category == null || !service.isActive()) {
                continue;
            }
            CoverageItem item = item(service, category, use.incidents(), available, minCriticality, minHolders);
            if (!onlyFlagged || item.flagged()) {
                items.add(item);
            }
        }
        items.sort(Comparator.comparing(CoverageItem::flagged).reversed()
                .thenComparing(Comparator.comparingInt(CoverageItem::criticality).reversed())
                .thenComparingInt(CoverageItem::eligibleCount)
                .thenComparing(i -> i.service().name())
                .thenComparing(i -> i.category().name()));
        long flagged = items.stream().filter(CoverageItem::flagged).count();
        return new CoverageRiskReport(now, windowDays, minCriticality, minHolders, available.size(), flagged, items);
    }

    private static CoverageItem item(ItService service, Category category, long incidents, List<User> available,
                                     int minCriticality, int minHolders) {
        List<Skill> required = category.getRequiredSkills().stream()
                .sorted(Comparator.comparing(Skill::getName)).toList();
        List<User> eligible = available.stream()
                .filter(u -> required.isEmpty() || profile(u).getSkills().hasAny(required)).toList();
        List<SkillCoverage> skills = required.stream()
                .map(s -> new SkillCoverage(s.getId(), s.getName(),
                        (int) available.stream().filter(u -> profile(u).getSkills().proficiencyIn(s).isPresent()).count()))
                .toList();
        int count = eligible.size();
        CoverageLevel level = count == 0 ? CoverageLevel.NO_COVERAGE : count == 1 ? CoverageLevel.SINGLE_HOLDER
                : count < minHolders ? CoverageLevel.THIN : CoverageLevel.COVERED;
        boolean flagged = service.getCriticality() >= minCriticality && count < minHolders;
        String message = switch (level) {
            case NO_COVERAGE -> "Nobody available can take " + category.getName() + " incidents on "
                    + service.getName();
            case SINGLE_HOLDER -> "Only " + eligible.get(0).getName() + " can take " + category.getName()
                    + " incidents on " + service.getName();
            case THIN -> "Only " + count + " technicians can take " + category.getName() + " incidents on "
                    + service.getName();
            case COVERED -> count + " technicians can take " + category.getName() + " incidents on "
                    + service.getName();
        };
        return new CoverageItem(new Ref(service.getId(), service.getName()), service.getCriticality(),
                new Ref(category.getId(), category.getName()), incidents, skills, count,
                eligible.stream().map(u -> new Ref(u.getId(), u.getName())).toList(), level, flagged, message);
    }

    private static TechnicianProfile profile(User technician) {
        return technician.technicianRole().orElseThrow().getProfile();
    }
}
