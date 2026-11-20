package com.iitsm.infrastructure.config;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * Flexible converter for String to Instant in Spring MVC query parameters.
 * Parses both full ISO-8601 date-times (e.g. 2026-11-20T00:00:00.000Z)
 * and date-only strings (e.g. 2026-11-20 -> 2026-11-20T00:00:00Z).
 */
@Component
public class StringToInstantConverter implements Converter<String, Instant> {

    @Override
    public Instant convert(String source) {
        if (source == null || source.isBlank()) {
            return null;
        }
        String trimmed = source.trim();
        try {
            return Instant.parse(trimmed);
        } catch (DateTimeParseException e) {
            try {
                return LocalDate.parse(trimmed).atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("Cannot parse '" + source + "' to Instant", ex);
            }
        }
    }
}
