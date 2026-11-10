package com.iitsm.domain.user;

import java.time.Instant;

import org.hibernate.annotations.Check;

import com.iitsm.domain.exception.InputValidationException;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

/** Technician-only data (table technician_profiles, keyed by the user id). */
@Entity
@Table(name = "technician_profiles")
@Check(name = "ck_technician_profiles_experience", constraints = "experience_level BETWEEN 1 AND 5")
@Check(name = "ck_technician_profiles_escalation", constraints = "escalation_level BETWEEN 0 AND 1")
public class TechnicianProfile {

    public static final int DEFAULT_MAX_LOAD = 10;

    @Id
    @Column(name = "user_id")
    private Long userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "experience_level", nullable = false)
    private short experienceLevel;

    /** 0 = technician, 1 = team lead. */
    @Column(name = "escalation_level", nullable = false)
    private short escalationLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability", nullable = false, length = 12)
    private Availability availability = Availability.AVAILABLE;

    @Column(name = "max_load", nullable = false)
    private int maxLoad = DEFAULT_MAX_LOAD;

    /** Drives round-robin assignment. */
    @Column(name = "last_assigned_at")
    private Instant lastAssignedAt;

    @Embedded
    private SkillSet skills = new SkillSet();

    protected TechnicianProfile() {
    }

    TechnicianProfile(User user, int experienceLevel, int escalationLevel, int maxLoad) {
        this.user = user;
        changeExperienceLevel(experienceLevel);
        changeEscalationLevel(escalationLevel);
        changeMaxLoad(maxLoad);
    }

    public int getExperienceLevel() {
        return experienceLevel;
    }

    public int getEscalationLevel() {
        return escalationLevel;
    }

    public boolean isTeamLead() {
        return escalationLevel == 1;
    }

    public Availability getAvailability() {
        return availability;
    }

    public int getMaxLoad() {
        return maxLoad;
    }

    public Instant getLastAssignedAt() {
        return lastAssignedAt;
    }

    public SkillSet getSkills() {
        return skills;
    }

    public void changeAvailability(Availability newAvailability) {
        this.availability = newAvailability;
    }

    public void changeExperienceLevel(int level) {
        if (level < 1 || level > 5) {
            throw new InputValidationException("experienceLevel", "Experience level must be between 1 and 5, was " + level);
        }
        this.experienceLevel = (short) level;
    }

    public void changeEscalationLevel(int level) {
        if (level < 0 || level > 1) {
            throw new InputValidationException("escalationLevel", "Technician escalation level must be 0 or 1, was " + level);
        }
        this.escalationLevel = (short) level;
    }

    public void changeMaxLoad(int newMaxLoad) {
        if (newMaxLoad < 1 || newMaxLoad > 50) {
            throw new InputValidationException("maxLoad", "Max load must be between 1 and 50, was " + newMaxLoad);
        }
        this.maxLoad = newMaxLoad;
    }

    public void markAssigned(Instant at) {
        this.lastAssignedAt = at;
    }
}
