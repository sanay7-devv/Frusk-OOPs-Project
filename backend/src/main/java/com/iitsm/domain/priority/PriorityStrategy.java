package com.iitsm.domain.priority;

import com.iitsm.domain.config.AppSettings;

/**
 * Strategy pattern: one way of turning an incident's impact, urgency and context into a score and a band.
 * The active strategy is chosen by the setting priority.strategy, so a new algorithm is one new class.
 * Thresholds and multipliers always come from the settings, never from constants.
 */
public interface PriorityStrategy {

    /** The name used in app_config (priority.strategy), for example WEIGHTED. */
    String name();

    PriorityBreakdown calculate(PriorityInput input, AppSettings settings);
}
