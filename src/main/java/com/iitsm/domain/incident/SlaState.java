package com.iitsm.domain.incident;

/** SLA health of an incident, computed centrally by {@link SlaTracker} (API Data Dictionary C.2). */
public enum SlaState {
    OK,
    WARNING,
    /** Predicted to miss the SLA (SLA risk score, module M12). */
    AT_RISK,
    VIOLATED,
    PAUSED,
    MET
}
