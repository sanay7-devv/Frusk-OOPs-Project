package com.iitsm.domain.incident;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.iitsm.domain.exception.InvalidStateTransitionException;

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
}
