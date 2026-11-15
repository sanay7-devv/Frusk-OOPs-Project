package com.iitsm.application.report;

/** Where an export writes its table: a header row first, then data rows (CSV stream or PDF collector). */
public interface ExportSink {

    void header(String... names);

    void row(Object... cells);
}
