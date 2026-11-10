package com.iitsm.application.catalog;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.catalog.CatalogViews.CategoryNode;
import com.iitsm.application.catalog.CatalogViews.CategoryView;
import com.iitsm.application.catalog.CatalogViews.ServiceSummary;
import com.iitsm.application.catalog.CatalogViews.ServiceView;
import com.iitsm.application.catalog.CatalogViews.SkillView;
import com.iitsm.domain.category.Category;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.ResourceNotFoundException;
import com.iitsm.domain.exception.ServiceNotFoundException;
import com.iitsm.domain.repository.CategoryRepository;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.repository.SkillRepository;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.user.Skill;

/**
 * Module M3 catalog: IT services (with dependencies), incident categories (a tree with required skills) and skills.
 * Services and categories are switched off instead of deleted, because incidents keep referring to them.
 */
@Service
public class CatalogService {

    private final ItServiceRepository services;
    private final CategoryRepository categories;
    private final SkillRepository skills;

    public CatalogService(ItServiceRepository services, CategoryRepository categories, SkillRepository skills) {
        this.services = services;
        this.categories = categories;
        this.skills = skills;
    }

    // ------------------------------------------------------------------ services

    @Transactional(readOnly = true)
    public List<ServiceSummary> activeServices() {
        return services.findByActiveTrueOrderByNameAsc().stream().map(ServiceSummary::of).toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceView> allServices() {
        return services.findAllByOrderByNameAsc().stream().map(ServiceView::of).toList();
    }

    @Transactional(readOnly = true)
    public ServiceView service(Long id) {
        return ServiceView.of(loadService(id));
    }

    @Transactional
    public ServiceView createService(String name, String owner, int criticality, boolean alwaysP1,
                                     String description, Collection<Long> dependencyIds) {
        String cleanName = name.strip();
        requireUniqueServiceName(cleanName, null);
        ItService service = new ItService(cleanName, owner, criticality, alwaysP1, description);
        service.replaceDependencies(loadServices(dependencyIds));
        return ServiceView.of(saveService(service));
    }

    @Transactional
    public ServiceView updateService(Long id, String name, String owner, int criticality, boolean alwaysP1,
                                     String description, boolean active, Collection<Long> dependencyIds) {
        ItService service = loadService(id);
        String cleanName = name.strip();
        requireUniqueServiceName(cleanName, service);
        service.update(cleanName, owner, criticality, alwaysP1, description);
        if (active) {
            service.activate();
        } else {
            service.deactivate();
        }
        if (dependencyIds != null) {
            service.replaceDependencies(loadServices(dependencyIds));
        }
        return ServiceView.of(saveService(service));
    }

    /** PUT /admin/services/{id}/dependencies. */
    @Transactional
    public ServiceView replaceDependencies(Long id, Collection<Long> dependencyIds) {
        ItService service = loadService(id);
        service.replaceDependencies(loadServices(dependencyIds));
        return ServiceView.of(service);
    }

    @Transactional
    public void deactivateService(Long id) {
        loadService(id).deactivate();
    }

    // ------------------------------------------------------------------ categories

    /** Active categories as a tree, children sorted by name. Children of a switched-off category are hidden too. */
    @Transactional(readOnly = true)
    public List<CategoryNode> activeCategoryTree() {
        List<Category> active = categories.findByActiveTrueOrderByNameAsc();
        Map<Long, List<Category>> childrenByParent = new HashMap<>();
        List<Category> roots = new ArrayList<>();
        for (Category category : active) {
            if (category.getParent() == null) {
                roots.add(category);
            } else {
                childrenByParent.computeIfAbsent(category.getParent().getId(), k -> new ArrayList<>()).add(category);
            }
        }
        return roots.stream().map(root -> toNode(root, childrenByParent)).toList();
    }

    private static CategoryNode toNode(Category category, Map<Long, List<Category>> childrenByParent) {
        List<CategoryNode> children = childrenByParent.getOrDefault(category.getId(), List.of()).stream()
                .map(child -> toNode(child, childrenByParent))
                .toList();
        return new CategoryNode(category.getId(), category.getName(), children);
    }

    @Transactional(readOnly = true)
    public List<CategoryView> allCategories() {
        return categories.findAllByOrderByNameAsc().stream().map(CategoryView::of).toList();
    }

    @Transactional
    public CategoryView createCategory(String name, Long parentId, Collection<Long> requiredSkillIds) {
        Category category = new Category(name.strip());
        category.moveUnder(parentId == null ? null : loadCategory(parentId));
        category.replaceRequiredSkills(loadSkills(requiredSkillIds));
        return CategoryView.of(categories.save(category));
    }

    @Transactional
    public CategoryView updateCategory(Long id, String name, Long parentId, boolean active,
                                       Collection<Long> requiredSkillIds) {
        Category category = loadCategory(id);
        category.rename(name.strip());
        category.moveUnder(parentId == null ? null : loadCategory(parentId));
        if (active) {
            category.activate();
        } else {
            category.deactivate();
        }
        category.replaceRequiredSkills(loadSkills(requiredSkillIds));
        return CategoryView.of(category);
    }

    @Transactional
    public void deactivateCategory(Long id) {
        loadCategory(id).deactivate();
    }

    // ------------------------------------------------------------------ skills

    @Transactional(readOnly = true)
    public List<SkillView> allSkills() {
        return skills.findAll().stream().map(SkillView::of).sorted(SkillView.BY_NAME).toList();
    }

    @Transactional
    public SkillView createSkill(String name) {
        String cleanName = name.strip();
        if (skills.existsByNameIgnoreCase(cleanName)) {
            throw new InputValidationException("name", "a skill with this name already exists");
        }
        return SkillView.of(skills.save(new Skill(cleanName)));
    }

    @Transactional
    public SkillView renameSkill(Long id, String name) {
        Skill skill = loadSkill(id);
        String cleanName = name.strip();
        if (!skill.getName().equalsIgnoreCase(cleanName) && skills.existsByNameIgnoreCase(cleanName)) {
            throw new InputValidationException("name", "a skill with this name already exists");
        }
        skill.rename(cleanName);
        return SkillView.of(skill);
    }

    /** Hard delete; refused while a category or a technician still uses the skill. */
    @Transactional
    public void deleteSkill(Long id) {
        Skill skill = loadSkill(id);
        try {
            skills.delete(skill);
            skills.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new InputValidationException("id", "the skill is still used by a category or a technician");
        }
    }

    // ------------------------------------------------------------------ helpers

    private ItService loadService(Long id) {
        return services.findById(id).orElseThrow(() -> new ServiceNotFoundException(id));
    }

    private Category loadCategory(Long id) {
        return categories.findById(id).orElseThrow(() -> new ResourceNotFoundException("Category", id));
    }

    private Skill loadSkill(Long id) {
        return skills.findById(id).orElseThrow(() -> new ResourceNotFoundException("Skill", id));
    }

    private Set<ItService> loadServices(Collection<Long> ids) {
        return loadAll(ids, services::findAllById, ItService::getId, "dependencyIds", "service");
    }

    private Set<Skill> loadSkills(Collection<Long> ids) {
        return loadAll(ids, skills::findAllById, Skill::getId, "requiredSkillIds", "skill");
    }

    /** Loads every id or reports the missing ones as a fieldError. */
    private static <T> Set<T> loadAll(Collection<Long> ids, Function<Iterable<Long>, List<T>> finder,
                                      Function<T, Long> idOf, String field, String what) {
        if (ids == null || ids.isEmpty()) {
            return Set.of();
        }
        Set<Long> wanted = new HashSet<>(ids);
        List<T> found = finder.apply(wanted);
        if (found.size() != wanted.size()) {
            Set<Long> missing = new HashSet<>(wanted);
            found.forEach(item -> missing.remove(idOf.apply(item)));
            throw new InputValidationException(field, "unknown " + what + " id(s): " + missing);
        }
        return new HashSet<>(found);
    }

    private void requireUniqueServiceName(String name, ItService current) {
        boolean renamed = current == null || !current.getName().equalsIgnoreCase(name);
        if (renamed && services.existsByNameIgnoreCase(name)) {
            throw new InputValidationException("name", "a service with this name already exists");
        }
    }

    private ItService saveService(ItService service) {
        try {
            return services.save(service);
        } catch (DataIntegrityViolationException ex) {
            throw new InputValidationException("name", "a service with this name already exists");
        }
    }
}
