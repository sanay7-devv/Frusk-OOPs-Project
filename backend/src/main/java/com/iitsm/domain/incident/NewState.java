package com.iitsm.domain.incident;

import java.time.Instant;

import com.iitsm.domain.category.Category;

/** Status NEW. */
final class NewState extends IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.NEW;
    }

    /** Automatic on creation. With no category the incident waits in triage, still CLASSIFIED. */
    @Override
    void classify(Incident incident, Category category, Instant now) {
        incident.setCategory(category);
        incident.moveTo(IncidentStatus.CLASSIFIED, now);
    }
}
