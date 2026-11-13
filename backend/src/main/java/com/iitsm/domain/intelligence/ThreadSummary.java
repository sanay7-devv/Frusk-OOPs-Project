package com.iitsm.domain.intelligence;

import java.util.List;

/** A short summary of the thread and notes for whoever takes the incident over. */
public record ThreadSummary(String summary, List<String> handoverNotes, AnalysisSource source) {

    public ThreadSummary {
        handoverNotes = List.copyOf(handoverNotes);
    }
}
