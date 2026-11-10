package com.iitsm.domain.service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.Set;

import com.iitsm.domain.exception.InputValidationException;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

/**
 * An IT service the organization runs (Payment, Database, VPN, ...). Named ItService so it is never confused with
 * Spring's @Service. Its business criticality (1 to 5) feeds the priority score; {@code alwaysP1} marks services
 * whose outage is always P1 (handbook 1.7, override rule 2). A service can depend on others (Payment depends on
 * Database), which the dependency graph and impact analysis use.
 */
@Entity
@Table(name = "services", check = @CheckConstraint(
        name = "ck_services_criticality", constraint = "criticality BETWEEN 1 AND 5"))
public class ItService {

    public static final int MIN_CRITICALITY = 1;
    public static final int MAX_CRITICALITY = 5;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 80)
    private String name;

    @Column(name = "owner", length = 80)
    private String owner;

    @Column(name = "criticality", nullable = false)
    private short criticality;

    @Column(name = "always_p1", nullable = false)
    private boolean alwaysP1;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    /** Services this one needs ("this depends on those"). Table service_dependencies. */
    @ManyToMany
    @JoinTable(name = "service_dependencies",
            joinColumns = @JoinColumn(name = "service_id"),
            inverseJoinColumns = @JoinColumn(name = "depends_on_id"),
            check = @CheckConstraint(name = "ck_service_dependencies_not_self",
                    constraint = "service_id <> depends_on_id"))
    private Set<ItService> dependencies = new HashSet<>();

    protected ItService() {
    }

    public ItService(String name, String owner, int criticality, boolean alwaysP1, String description) {
        this.name = name;
        this.owner = owner;
        changeCriticality(criticality);
        this.alwaysP1 = alwaysP1;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getOwner() {
        return owner;
    }

    public int getCriticality() {
        return criticality;
    }

    public boolean isAlwaysP1() {
        return alwaysP1;
    }

    public String getDescription() {
        return description;
    }

    public boolean isActive() {
        return active;
    }

    public Set<ItService> getDependencies() {
        return Set.copyOf(dependencies);
    }

    public void update(String newName, String newOwner, int newCriticality, boolean newAlwaysP1,
                       String newDescription) {
        this.name = newName;
        this.owner = newOwner;
        changeCriticality(newCriticality);
        this.alwaysP1 = newAlwaysP1;
        this.description = newDescription;
    }

    public void changeCriticality(int value) {
        if (value < MIN_CRITICALITY || value > MAX_CRITICALITY) {
            throw new InputValidationException("criticality", "must be between 1 and 5");
        }
        this.criticality = (short) value;
    }

    public void activate() {
        this.active = true;
    }

    /** Services are never deleted (incidents keep pointing at them); they are switched off instead. */
    public void deactivate() {
        this.active = false;
    }

    /**
     * Replaces the dependency list. Rejects a self-reference and anything that would close a cycle
     * (A depends on B depends on A), because impact analysis walks this graph.
     */
    public void replaceDependencies(Set<ItService> newDependencies) {
        for (ItService candidate : newDependencies) {
            if (candidate == this || (id != null && id.equals(candidate.getId()))) {
                throw new InputValidationException("dependencyIds", "a service cannot depend on itself");
            }
            if (candidate.dependsOnTransitively(this)) {
                throw new InputValidationException("dependencyIds",
                        "depending on " + candidate.getName() + " would create a cycle");
            }
        }
        dependencies.clear();
        dependencies.addAll(newDependencies);
    }

    /** True if this service needs {@code other}, directly or through other services (depth-first walk). */
    public boolean dependsOnTransitively(ItService other) {
        Set<ItService> visited = new HashSet<>();
        Deque<ItService> toVisit = new ArrayDeque<>(dependencies);
        while (!toVisit.isEmpty()) {
            ItService next = toVisit.pop();
            if (next.equals(other)) {
                return true;
            }
            if (visited.add(next)) {
                toVisit.addAll(next.getDependencies());
            }
        }
        return false;
    }

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof ItService other && id != null && id.equals(other.getId()));
    }

    @Override
    public int hashCode() {
        return ItService.class.hashCode();
    }
}
