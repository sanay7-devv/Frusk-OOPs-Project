package com.iitsm.domain.category;

import java.util.HashSet;
import java.util.Set;

import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.user.Skill;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * The type of problem (Network, Database, Security, ...). Categories form a tree (Network has VPN and Wi-Fi) and
 * are admin-managed, never hard-coded, so a new category needs no code change. Each lists the skills needed to
 * resolve it, which drives technician eligibility in assignment.
 */
@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 60)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @ManyToMany
    @JoinTable(name = "category_skills",
            joinColumns = @JoinColumn(name = "category_id"),
            inverseJoinColumns = @JoinColumn(name = "skill_id"))
    private Set<Skill> requiredSkills = new HashSet<>();

    protected Category() {
    }

    public Category(String name) {
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Category getParent() {
        return parent;
    }

    /**
     * True if this category is named {@code categoryName} (ignoring case) or sits anywhere under it, for example
     * Phishing under Security. Used for rules that name a category in a setting (decision DEC-46, C3).
     */
    public boolean isWithin(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return false;
        }
        for (Category c = this; c != null; c = c.getParent()) {
            if (c.getName().equalsIgnoreCase(categoryName.strip())) {
                return true;
            }
        }
        return false;
    }

    public boolean isActive() {
        return active;
    }

    public Set<Skill> getRequiredSkills() {
        return Set.copyOf(requiredSkills);
    }

    public void rename(String newName) {
        this.name = newName;
    }

    public void activate() {
        this.active = true;
    }

    /** Categories are never deleted (incidents keep pointing at them); they are switched off instead. */
    public void deactivate() {
        this.active = false;
    }

    /** Moves this category under {@code newParent} (null = top level). Rejects moves that would form a loop. */
    public void moveUnder(Category newParent) {
        for (Category ancestor = newParent; ancestor != null; ancestor = ancestor.getParent()) {
            if (ancestor == this || (id != null && id.equals(ancestor.getId()))) {
                throw new InputValidationException("parentId", "a category cannot be placed under itself");
            }
        }
        this.parent = newParent;
    }

    public void replaceRequiredSkills(Set<Skill> skills) {
        requiredSkills.clear();
        requiredSkills.addAll(skills);
    }

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof Category other && id != null && id.equals(other.getId()));
    }

    @Override
    public int hashCode() {
        return Category.class.hashCode();
    }
}
