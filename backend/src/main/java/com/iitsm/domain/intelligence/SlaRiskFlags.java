package com.iitsm.domain.intelligence;

import java.util.Set;

/**
 * The incidents the SLA risk scan currently flags (handbook 2.5 M12). One port read by both the view mapper (the
 * shown {@code slaState}) and the incident search (the {@code slaState} filter), so the two cannot disagree.
 */
public interface SlaRiskFlags {

    /** Ids flagged by the last scans and not yet cleared; a snapshot, never null. */
    Set<Long> flaggedIds();
}
