package com.iitsm.domain.incident;

import java.util.EnumMap;
import java.util.Map;

/**
 * Maps the status stored in the database to its state object (handbook 2.5 M4). One shared, stateless instance per
 * status; an EnumMap gives constant-time lookup.
 */
public final class StateFactory {

    private static final Map<IncidentStatus, IncidentState> STATES = new EnumMap<>(IncidentStatus.class);

    static {
        register(new NewState());
        register(new ClassifiedState());
        register(new AssignedState());
        register(new AcknowledgedState());
        register(new InProgressState());
        register(new PendingUserInfoState());
        register(new ResolvedState());
        register(new VerifiedState());
        register(new ClosedState());
        register(new ReopenedState());
    }

    private StateFactory() {
    }

    private static void register(IncidentState state) {
        STATES.put(state.status(), state);
    }

    public static IncidentState of(IncidentStatus status) {
        IncidentState state = STATES.get(status);
        if (state == null) {
            throw new IllegalStateException("No state class for status " + status);
        }
        return state;
    }
}
