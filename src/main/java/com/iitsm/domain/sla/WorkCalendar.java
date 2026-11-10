package com.iitsm.domain.sla;

import java.time.Duration;
import java.time.Instant;

/**
 * How SLA time is counted (handbook 2.5 M7, Strategy pattern): around the clock, or only during business hours.
 * Every SLA deadline and every "how much of the clock has run" goes through this interface, so a policy's
 * calendar type changes both consistently.
 */
public interface WorkCalendar {

    /** The moment {@code work} of counted time after {@code start}. */
    Instant addWorkingTime(Instant start, Duration work);

    /** Counted time between two moments; negative if {@code to} is before {@code from}. */
    Duration workingTimeBetween(Instant from, Instant to);
}
