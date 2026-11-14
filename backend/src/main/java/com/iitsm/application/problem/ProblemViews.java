package com.iitsm.application.problem;

import java.time.Instant;
import java.util.List;

import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.domain.problem.ProblemStatus;

/** What the problem endpoints return (API Data Dictionary C.4 ProblemRecord). */
public final class ProblemViews {

    private ProblemViews() {
    }

    /**
     * One problem record: {@code lead} is the highest-priority, earliest linked incident (decision DEC-46, G5), and
     * {@code incidents} are all linked incidents, oldest first.
     */
    public record ProblemView(Long id, String title, Ref service, ProblemStatus status, Instant createdAt,
                              IncidentSummary lead, int incidentCount, List<IncidentSummary> incidents) {
    }
}
