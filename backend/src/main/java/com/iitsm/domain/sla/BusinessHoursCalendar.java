package com.iitsm.domain.sla;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Set;

/**
 * One company calendar (decision DEC-39): only the hours between {@code open} and {@code close} on working days
 * that are not holidays count, in the company's time zone. Example with Mon-Fri 09:00-18:00: an 8-hour clock
 * started on Friday at 16:00 runs out on Monday at 15:00.
 */
public record BusinessHoursCalendar(ZoneId zone, LocalTime open, LocalTime close, Set<DayOfWeek> workingDays,
                                    Set<LocalDate> holidays) implements WorkCalendar {

    /** Longest search, far beyond any SLA target (the maximum resolution target is 30 days). */
    private static final int MAX_DAYS = 3660;

    public BusinessHoursCalendar {
        if (!open.isBefore(close)) {
            throw new IllegalArgumentException("open must be before close");
        }
        if (workingDays.isEmpty()) {
            throw new IllegalArgumentException("at least one working day is needed");
        }
        workingDays = Set.copyOf(workingDays);
        holidays = Set.copyOf(holidays);
    }

    /** A negative amount (a deadline already passed while paused) is applied as plain clock time. */
    @Override
    public Instant addWorkingTime(Instant start, Duration work) {
        if (work.isNegative() || work.isZero()) {
            return start.plus(work);
        }
        ZonedDateTime at = start.atZone(zone);
        Duration remaining = work;
        for (int day = 0; day < MAX_DAYS; day++) {
            LocalDate date = at.toLocalDate();
            if (isWorkingDay(date)) {
                ZonedDateTime opens = date.atTime(open).atZone(zone);
                ZonedDateTime closes = date.atTime(close).atZone(zone);
                if (at.isBefore(opens)) {
                    at = opens;
                }
                if (at.isBefore(closes)) {
                    Duration available = Duration.between(at, closes);
                    if (remaining.compareTo(available) <= 0) {
                        return at.plus(remaining).toInstant();
                    }
                    remaining = remaining.minus(available);
                }
            }
            at = date.plusDays(1).atStartOfDay(zone);
        }
        throw new IllegalStateException("no working time within " + MAX_DAYS + " days");
    }

    @Override
    public Duration workingTimeBetween(Instant from, Instant to) {
        if (to.isBefore(from)) {
            return workingTimeBetween(to, from).negated();
        }
        ZonedDateTime start = from.atZone(zone);
        ZonedDateTime end = to.atZone(zone);
        Duration total = Duration.ZERO;
        for (LocalDate date = start.toLocalDate(); !date.isAfter(end.toLocalDate()); date = date.plusDays(1)) {
            if (!isWorkingDay(date)) {
                continue;
            }
            ZonedDateTime opens = date.atTime(open).atZone(zone);
            ZonedDateTime closes = date.atTime(close).atZone(zone);
            ZonedDateTime a = start.isAfter(opens) ? start : opens;
            ZonedDateTime b = end.isBefore(closes) ? end : closes;
            if (a.isBefore(b)) {
                total = total.plus(Duration.between(a, b));
            }
        }
        return total;
    }

    private boolean isWorkingDay(LocalDate date) {
        return workingDays.contains(date.getDayOfWeek()) && !holidays.contains(date);
    }
}
