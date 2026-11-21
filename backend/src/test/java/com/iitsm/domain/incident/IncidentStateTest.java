package com.iitsm.domain.incident;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

import org.junit.jupiter.api.Test;

import com.iitsm.domain.exception.InvalidStateTransitionException;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.sla.SlaTargets;
import com.iitsm.domain.sla.WorkCalendar;
import com.iitsm.domain.user.User;

class IncidentStateTest {

    private static final Instant NOW = Instant.parse("2026-11-20T12:00:00Z");

    @Test
    void factory_has_a_matching_state_for_every_incident_status() {
        for (IncidentStatus status : IncidentStatus.values()) {
            assertEquals(status, StateFactory.of(status).status(), status.name());
        }
    }

    @Test
    void open_states_expose_the_expected_actions_and_closed_states_are_guarded() {
        Incident incident = mock(Incident.class);
        Map<IncidentStatus, Set<IncidentAction>> expected = Map.ofEntries(
                Map.entry(IncidentStatus.NEW, Set.of()),
                Map.entry(IncidentStatus.CLASSIFIED, Set.of(IncidentAction.ASSIGN, IncidentAction.WITHDRAW,
                        IncidentAction.MARK_DUPLICATE)),
                Map.entry(IncidentStatus.ASSIGNED, Set.of(IncidentAction.ACKNOWLEDGE, IncidentAction.REASSIGN,
                        IncidentAction.WITHDRAW, IncidentAction.MARK_DUPLICATE, IncidentAction.ESCALATE)),
                Map.entry(IncidentStatus.ACKNOWLEDGED, Set.of(IncidentAction.START_WORK,
                        IncidentAction.REASSIGN, IncidentAction.WITHDRAW, IncidentAction.MARK_DUPLICATE,
                        IncidentAction.ESCALATE)),
                Map.entry(IncidentStatus.IN_PROGRESS, Set.of(IncidentAction.REQUEST_INFO, IncidentAction.RESOLVE,
                        IncidentAction.REASSIGN, IncidentAction.MARK_DUPLICATE, IncidentAction.ESCALATE)),
                Map.entry(IncidentStatus.PENDING_USER_INFO, Set.of(IncidentAction.PROVIDE_INFO,
                        IncidentAction.MARK_DUPLICATE)),
                Map.entry(IncidentStatus.RESOLVED, Set.of(IncidentAction.VERIFY, IncidentAction.REOPEN)),
                Map.entry(IncidentStatus.VERIFIED, Set.of(IncidentAction.CLOSE)),
                Map.entry(IncidentStatus.CLOSED, Set.of()),
                Map.entry(IncidentStatus.REOPENED, Set.of(IncidentAction.START_WORK, IncidentAction.MARK_DUPLICATE)));

        expected.forEach((status, actions) -> assertEquals(actions,
                StateFactory.of(status).legalActions(incident, NOW, Duration.ofDays(7)), status.name()));

        assertThrows(InvalidStateTransitionException.class,
                () -> StateFactory.of(IncidentStatus.ASSIGNED).classify(incident, null, NOW));
        assertThrows(InvalidStateTransitionException.class,
                () -> StateFactory.of(IncidentStatus.CLOSED).verify(incident, NOW));
        assertInstanceOf(InvalidStateTransitionException.class,
                assertThrows(InvalidStateTransitionException.class,
                        () -> StateFactory.of(IncidentStatus.IN_PROGRESS).close(incident,
                                ClosureReason.VERIFIED, NOW)));
    }

    @Test
    void successful_lifecycle_actions_move_to_the_expected_next_state() {
        assertMovesTo(IncidentStatus.CLASSIFIED,
                incident -> StateFactory.of(IncidentStatus.NEW).classify(incident, null, NOW));
        assertMovesTo(IncidentStatus.ASSIGNED,
                incident -> StateFactory.of(IncidentStatus.CLASSIFIED).assign(incident, mock(User.class), NOW));
        assertMovesTo(IncidentStatus.ACKNOWLEDGED,
                incident -> StateFactory.of(IncidentStatus.ASSIGNED).acknowledge(incident, NOW));
        assertMovesTo(IncidentStatus.IN_PROGRESS,
                incident -> StateFactory.of(IncidentStatus.ACKNOWLEDGED).startWork(incident, NOW));
        assertMovesTo(IncidentStatus.PENDING_USER_INFO,
                incident -> StateFactory.of(IncidentStatus.IN_PROGRESS).requestInfo(incident, "Need a test detail", NOW));
        assertMovesTo(IncidentStatus.IN_PROGRESS,
                incident -> StateFactory.of(IncidentStatus.PENDING_USER_INFO)
                        .provideInfo(incident, "Test reply", NOW, mock(WorkCalendar.class)));
        assertMovesTo(IncidentStatus.RESOLVED,
                incident -> StateFactory.of(IncidentStatus.IN_PROGRESS).resolve(incident, resolution(), NOW));
        assertMovesTo(IncidentStatus.VERIFIED,
                incident -> StateFactory.of(IncidentStatus.RESOLVED).verify(incident, NOW));
        assertMovesTo(IncidentStatus.CLOSED,
                incident -> StateFactory.of(IncidentStatus.VERIFIED).close(incident, ClosureReason.VERIFIED, NOW));
        assertMovesTo(IncidentStatus.REOPENED,
                incident -> StateFactory.of(IncidentStatus.RESOLVED)
                        .reopen(incident, "Need more follow-up", NOW, Duration.ofDays(7), mock(SlaTargets.class)));
        assertMovesTo(IncidentStatus.REOPENED, incident -> {
            when(incident.getClosureReason()).thenReturn(ClosureReason.VERIFIED);
            when(incident.getClosedAt()).thenReturn(NOW.minusSeconds(1));
            StateFactory.of(IncidentStatus.CLOSED)
                    .reopen(incident, "Need more follow-up", NOW, Duration.ofDays(7), mock(SlaTargets.class));
        });
        assertMovesTo(IncidentStatus.IN_PROGRESS,
                incident -> StateFactory.of(IncidentStatus.REOPENED).startWork(incident, NOW));
    }

    @Test
    void successful_alternate_actions_keep_or_close_the_expected_state() {
        assertMovesTo(IncidentStatus.ASSIGNED,
                incident -> StateFactory.of(IncidentStatus.ASSIGNED).reassign(incident, mock(User.class), NOW));
        assertMovesTo(IncidentStatus.CLOSED,
                incident -> StateFactory.of(IncidentStatus.CLASSIFIED).withdraw(incident,
                        "Reporter changed their mind", NOW));
        assertMovesTo(IncidentStatus.RESOLVED,
                incident -> StateFactory.of(IncidentStatus.ASSIGNED).resolveWithProblem(incident, resolution(), NOW));
        assertMovesTo(IncidentStatus.CLOSED,
                incident -> {
                    Incident original = mock(Incident.class);
                    when(original.getId()).thenReturn(2L);
                    StateFactory.of(IncidentStatus.IN_PROGRESS).markDuplicate(incident, original, NOW);
                });

        Incident incident = mock(Incident.class);
        StateFactory.of(IncidentStatus.IN_PROGRESS).escalate(incident, NOW);
        verify(incident).raiseEscalationLevel(NOW);
    }

    private static void assertMovesTo(IncidentStatus next, Consumer<Incident> action) {
        Incident incident = mock(Incident.class);
        when(incident.getId()).thenReturn(1L);
        when(incident.getPriority()).thenReturn(Priority.P2);
        when(incident.isReportedBy(any())).thenReturn(false);

        action.accept(incident);

        verify(incident).moveTo(next, NOW);
    }

    private static Resolution resolution() {
        return new Resolution("Network failure", "Replaced the failed component", "Replace component", 30, false);
    }
}
