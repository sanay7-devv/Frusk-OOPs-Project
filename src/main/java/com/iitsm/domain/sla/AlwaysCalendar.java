package com.iitsm.domain.sla;

import java.time.Duration;
import java.time.Instant;

/** 24/7: every second counts (the default calendar, CalendarType.ALWAYS). */
public final class AlwaysCalendar implements WorkCalendar {

    public static final AlwaysCalendar INSTANCE = new AlwaysCalendar();

    private AlwaysCalendar() {
    }

    @Override
    public Instant addWorkingTime(Instant start, Duration work) {
        return start.plus(work);
    }

    @Override
    public Duration workingTimeBetween(Instant from, Instant to) {
        return Duration.between(from, to);
    }
}
