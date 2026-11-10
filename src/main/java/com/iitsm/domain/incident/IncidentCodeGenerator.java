package com.iitsm.domain.incident;

/** Port: hands out the next human-readable incident code, for example INC-2026-00001 (database sequence). */
public interface IncidentCodeGenerator {

    String nextCode(int year);
}
