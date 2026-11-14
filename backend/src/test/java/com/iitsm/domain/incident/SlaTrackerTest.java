package com.iitsm.domain.incident;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Duration;
import java.time.Instant;
import com.iitsm.domain.sla.AlwaysCalendar;
import com.iitsm.domain.sla.SlaTargets;
import org.junit.jupiter.api.Test;

class SlaTrackerTest {
    private final Instant start=Instant.parse("2026-01-01T00:00:00Z");
    private final SlaTargets targets=new SlaTargets(
            Duration.ofMinutes(5),Duration.ofMinutes(100),AlwaysCalendar.INSTANCE);

    @Test void deadlines_start_at_creation_and_resume_shifts_resolution_only() {
        var tracker=new SlaTracker(); tracker.start(start,targets);
        assertEquals(start.plusSeconds(300),tracker.getResponseDue());
        assertEquals(start.plusSeconds(6000),tracker.getResolutionDue());
        tracker.pause(start.plusSeconds(600));
        assertTrue(tracker.check(start.plusSeconds(1800),false,true,targets,75,90).isEmpty());
        tracker.resume(start.plusSeconds(1800),AlwaysCalendar.INSTANCE);
        assertEquals(1200,tracker.getPausedSeconds());
        assertEquals(start.plusSeconds(7200),tracker.getResolutionDue());
        assertEquals(start.plusSeconds(300),tracker.getResponseDue());
        assertFalse(tracker.isPaused());
        tracker.resume(start.plusSeconds(1900),AlwaysCalendar.INSTANCE);
        assertEquals(1200,tracker.getPausedSeconds());
    }

    @Test void warning_and_violation_each_fire_once_at_exact_thresholds() {
        var tracker=new SlaTracker(); tracker.start(start,targets);
        assertTrue(tracker.check(start.plusSeconds(4499),false,true,targets,75,90).isEmpty());
        var levels=new SlaAlert.Level[]{SlaAlert.Level.FIRST_WARNING,
                SlaAlert.Level.SECOND_WARNING,SlaAlert.Level.VIOLATION};
        int[] seconds={4500,5400,6000};
        for(int i=0;i<seconds.length;i++) {
            var time=start.plusSeconds(seconds[i]);
            var alerts=tracker.check(time,false,true,targets,75,90);
            assertEquals(1,alerts.size()); assertEquals(levels[i],alerts.getFirst().level());
            assertTrue(tracker.check(time,false,true,targets,75,90).isEmpty());
        }
        assertTrue(tracker.isResolutionViolated());
    }

    @Test void reopen_restarts_resolution_and_allows_fresh_warnings() {
        var tracker=new SlaTracker(); tracker.start(start,targets);
        tracker.check(start.plusSeconds(6000),false,true,targets,75,90);
        tracker.restartResolution(start.plusSeconds(7000),targets);
        assertFalse(tracker.isResolutionViolated());
        assertEquals(start.plusSeconds(13000),tracker.getResolutionDue());
        assertEquals(SlaAlert.Level.FIRST_WARNING,
                tracker.check(start.plusSeconds(11500),false,true,targets,75,90).getFirst().level());
    }
}
