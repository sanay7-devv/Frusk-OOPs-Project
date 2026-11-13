package com.iitsm.domain.event;

import java.time.Instant;

/**
 * One run of the SLA monitor finished (decision DEC-48). The notification listener folds the warnings of the run
 * into digests when one person would otherwise get too many (alert storm control, decision DEC-42).
 */
public record SlaRunCompleted(int warnings, int violations, Instant occurredAt) {
}
