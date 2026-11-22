package com.iitsm.infrastructure.config;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * Flexible converter for String to Instant in Spring MVC query parameters.
 * Parses:
 * - full ISO-8601 instants (e.g. 2026-11-20T00:00:00.000Z)
 * - offset date-times (e.g. 2026-11-20T00:00:00+05:30 or decoded 2026-11-20T00:00:00 05:30)
 * - local date-times without offset (e.g. 2026-11-20T00:00:00 or 2026-11-20 00:00:00 -> UTC)
 * - date-only strings (e.g. 2026-11-20 -> 2026-11-20T00:00:00Z).
 */
@Component
public class StringToInstantConverter implements Converter<String, Instant> {

    @Override
    public Instant convert(String source) {
        if (source == null || source.isBlank()) {
            return null;
        }
        String trimmed = source.trim();
        // If '+' was decoded into space by URL query decoder (e.g. "2026-11-20T00:00:00 05:30")
        if (trimmed.matches(".*\\d{2}:\\d{2}\\s+\\d{2}:\\d{2}$")) {
            trimmed = trimmed.replaceFirst("\\s+(\\d{2}:\\d{2})$", "+$1");
        }
        // 1. Try Instant.parse (e.g. "2026-11-20T00:00:00.000Z")
        try {
            return Instant.parse(trimmed);
        } catch (DateTimeParseException ignored) {
        }

        // 2. Try OffsetDateTime (e.g. "2026-11-20T00:00:00+05:30")
        try {
            return OffsetDateTime.parse(trimmed).toInstant();
        } catch (DateTimeParseException ignored) {
        }

        // 3. Try LocalDateTime (e.g. "2026-11-20T00:00:00" or "2026-11-20 00:00:00")
        try {
            String isoLocal = trimmed.replace(' ', 'T');
            return LocalDateTime.parse(isoLocal).toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ignored) {
        }

        // 4. Try LocalDate (e.g. "2026-11-20")
        try {
            return LocalDate.parse(trimmed).atStartOfDay(ZoneOffset.UTC).toInstant();
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Cannot parse '" + source + "' to Instant", ex);
        }
    }
}
