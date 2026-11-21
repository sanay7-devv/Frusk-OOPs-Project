package com.iitsm.domain.audit;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Readable values for audit descriptions: durations as "3 d 2 h" and instants as "2026-11-15 16:29 UTC", never raw
 * seconds or ISO text with nanoseconds. Applies to new descriptions only; stored rows are never rewritten.
 */
public final class AuditText {

    private static final DateTimeFormatter MINUTES =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneOffset.UTC);

    private AuditText() {
    }

    /** The two largest non-zero units among days, hours, minutes, seconds; "0 s" for zero or less. */
    public static String duration(long seconds) {
        if (seconds <= 0) {
            return "0 s";
        }
        long[] parts = {seconds / 86400, seconds % 86400 / 3600, seconds % 3600 / 60, seconds % 60};
        String[] units = {"d", "h", "min", "s"};
        StringBuilder text = new StringBuilder();
        int used = 0;
        for (int i = 0; i < parts.length && used < 2; i++) {
            if (parts[i] > 0) {
                text.append(used > 0 ? " " : "").append(parts[i]).append(' ').append(units[i]);
                used++;
            }
        }
        return text.toString();
    }

    /** Minute precision in UTC; "none" for null. */
    public static String instant(Instant at) {
        return at == null ? "none" : MINUTES.format(at) + " UTC";
    }
}
