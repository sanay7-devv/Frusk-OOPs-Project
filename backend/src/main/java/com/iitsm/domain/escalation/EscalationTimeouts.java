package com.iitsm.domain.escalation;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

import com.iitsm.domain.priority.Priority;

/**
 * The waiting times of the chain, read from the {@code escalation_policies} rows and the exhausted-alert setting.
 * {@code toReach} holds, per priority, how long an incident may stay unacknowledged at the previous level before it
 * moves up to the key level (so key 1 is the time at level 0). Wall-clock minutes (DEC-42). A priority or level
 * without a row has no timeout: the incident does not climb there.
 */
public record EscalationTimeouts(Map<Priority, Map<Integer, Duration>> toReach, Duration exhaustedWait) {

    public EscalationTimeouts {
        toReach = Map.copyOf(toReach);
    }

    public Optional<Duration> timeToReach(Priority priority, int level) {
        Map<Integer, Duration> levels = toReach.get(priority);
        return levels == null ? Optional.empty() : Optional.ofNullable(levels.get(level));
    }
}
