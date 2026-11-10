package com.iitsm.domain.user;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import com.iitsm.domain.exception.InputValidationException;

import jakarta.persistence.CheckConstraint;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyJoinColumn;

/**
 * The skills a technician holds, each with a proficiency from 1 to 5 (table technician_skills).
 * A value object composed into the technician profile; the map is never handed out for modification.
 */
@Embeddable
public class SkillSet {

    public static final int MIN_PROFICIENCY = 1;
    public static final int MAX_PROFICIENCY = 5;

    /** Short because the column is SMALLINT (Appendix A.1); the public API uses int. */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "technician_skills", joinColumns = @JoinColumn(name = "technician_id"))
    @MapKeyJoinColumn(name = "skill_id")
    @Column(name = "proficiency", nullable = false, check = @CheckConstraint(
            name = "ck_technician_skills_proficiency", constraint = "proficiency BETWEEN 1 AND 5"))
    private Map<Skill, Short> proficiencies = new HashMap<>();

    public void set(Skill skill, int proficiency) {
        if (proficiency < MIN_PROFICIENCY || proficiency > MAX_PROFICIENCY) {
            throw new InputValidationException("proficiency", "Proficiency must be between 1 and 5, was " + proficiency);
        }
        proficiencies.put(skill, (short) proficiency);
    }

    public void remove(Skill skill) {
        proficiencies.remove(skill);
    }

    /** Replaces every skill at once (PUT /admin/technicians/{id}/skills). */
    public void replaceWith(Map<Skill, Integer> newSkills) {
        proficiencies.clear();
        newSkills.forEach(this::set);
    }

    public Optional<Integer> proficiencyIn(Skill skill) {
        return Optional.ofNullable(proficiencies.get(skill)).map(Short::intValue);
    }

    public boolean hasAny(Iterable<Skill> required) {
        for (Skill skill : required) {
            if (proficiencies.containsKey(skill)) {
                return true;
            }
        }
        return false;
    }

    public Map<Skill, Integer> asMap() {
        Map<Skill, Integer> copy = new HashMap<>();
        proficiencies.forEach((skill, level) -> copy.put(skill, level.intValue()));
        return Map.copyOf(copy);
    }
}
