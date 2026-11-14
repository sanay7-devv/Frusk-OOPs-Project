package com.iitsm.domain.assignment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Optional;
import java.util.Set;
import com.iitsm.domain.category.Category;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class EligibilityFilterTest {
    private User technician;
    private Incident incident;
    private TechnicianProfile profile;

    @BeforeEach void available_technician() {
        technician=mock(User.class); incident=mock(Incident.class);
        profile=mock(TechnicianProfile.class);
        var role=mock(TechnicianRole.class);
        when(technician.getId()).thenReturn(2L);
        when(technician.isActive()).thenReturn(true);
        when(technician.technicianRole()).thenReturn(Optional.of(role));
        when(role.getProfile()).thenReturn(profile);
        when(profile.getAvailability()).thenReturn(Availability.AVAILABLE);
        when(profile.getMaxLoad()).thenReturn(10);
    }

    @Test void load_nine_accepts_but_load_ten_excludes() {
        assertTrue(EligibilityFilter.isEligible(technician,incident,9));
        assertEquals(EligibilityFilter.Ineligibility.Kind.OVERLOADED,
                EligibilityFilter.check(technician,incident,10).orElseThrow().kind());
    }

    @Test void away_and_off_duty_never_receive_work() {
        for (var availability : new Availability[]{Availability.AWAY,Availability.OFF_DUTY}) {
            when(profile.getAvailability()).thenReturn(availability);
            assertFalse(EligibilityFilter.isEligible(technician,incident,0));
        }
    }

    @Test void busy_below_capacity_can_receive_work() {
        when(profile.getAvailability()).thenReturn(Availability.BUSY);
        assertTrue(EligibilityFilter.isEligible(technician,incident,9));
    }

    @Test void reporter_cannot_handle_their_own_incident() {
        when(incident.isReportedBy(2L)).thenReturn(true);
        assertEquals(EligibilityFilter.Ineligibility.Kind.CONFLICT_OF_INTEREST,
                EligibilityFilter.check(technician,incident,0).orElseThrow().kind());
    }

    @Test void deactivated_or_non_technician_is_excluded() {
        when(technician.isActive()).thenReturn(false);
        assertFalse(EligibilityFilter.isEligible(technician,incident,0));
        when(technician.isActive()).thenReturn(true);
        when(technician.technicianRole()).thenReturn(Optional.empty());
        assertFalse(EligibilityFilter.isEligible(technician,incident,0));
    }

    @Test void category_requires_at_least_one_matching_skill() {
        var category=mock(Category.class); var required=mock(Skill.class);
        var skills=new SkillSet();
        when(incident.getCategory()).thenReturn(category);
        when(category.getRequiredSkills()).thenReturn(Set.of(required));
        when(profile.getSkills()).thenReturn(skills);
        assertFalse(EligibilityFilter.isEligible(technician,incident,0));
        skills.set(required,3);
        assertTrue(EligibilityFilter.isEligible(technician,incident,0));
    }
}
