package com.iitsm.application.report;

import java.time.Instant;
import java.util.List;

/** Port: turns an export table into a PDF document (Adapter pattern; the PDF library lives in infrastructure). */
public interface ReportPdfRenderer {

    /**
     * What the PDF shows: a title, the requested range (either end may be null for open), when it was generated,
     * the table, and whether the row cap cut it short.
     */
    record ReportDocument(String title, Instant from, Instant to, Instant generatedAt, List<String> headers,
                          List<List<String>> rows, boolean capped) {
    }

    byte[] render(ReportDocument document);
}
