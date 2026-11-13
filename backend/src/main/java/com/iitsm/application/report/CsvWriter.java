package com.iitsm.application.report;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.List;

/**
 * Writes RFC 4180 CSV and neutralises formula injection: a text cell that starts with =, +, - or @ (or a tab or
 * carriage return) would be run as a formula by Excel or Sheets, so it gets a leading apostrophe (OWASP CSV
 * injection advice, decision DEC-62). Numbers are written as they are and are never altered.
 */
public final class CsvWriter {

    private static final String DANGEROUS_START = "=+-@\t\r";

    private final Appendable out;

    public CsvWriter(Appendable out) {
        this.out = out;
    }

    /** One row; Number cells stay as numbers, everything else is text. */
    public void row(List<?> cells) {
        try {
            for (int i = 0; i < cells.size(); i++) {
                if (i > 0) {
                    out.append(',');
                }
                out.append(cell(cells.get(i)));
            }
            out.append("\r\n");
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    public void row(Object... cells) {
        row(Arrays.asList(cells));
    }

    /** The escaped form of one cell. */
    public static String cell(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        String text = neutralise(value.toString());
        boolean quote = text.indexOf(',') >= 0 || text.indexOf('"') >= 0 || text.indexOf('\n') >= 0
                || text.indexOf('\r') >= 0;
        return quote ? '"' + text.replace("\"", "\"\"") + '"' : text;
    }

    /** Prefixes an apostrophe when the text would start a spreadsheet formula. */
    public static String neutralise(String text) {
        return !text.isEmpty() && DANGEROUS_START.indexOf(text.charAt(0)) >= 0 ? "'" + text : text;
    }
}
