package com.iitsm.domain.escalation;

import java.time.Instant;

import com.iitsm.domain.priority.Priority;

/**
 * What the chain needs to know about one unacknowledged incident.
 *
 * @param currentLevel    the incident's escalation_level (0 to 3)
 * @param levelSince      when the incident came to its current level, or was last handed to someone at it
 * @param exhaustedRaised whether the final "escalation exhausted" alert was already raised (DEC-49)
 */
public record EscalationRequest(Priority priority, int currentLevel, Instant levelSince, boolean exhaustedRaised,
                                EscalationTimeouts timeouts) {
}
