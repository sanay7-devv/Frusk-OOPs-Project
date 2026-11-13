package com.iitsm.domain.intelligence;

import java.time.Instant;
import java.util.List;

/** Everything the summariser reads about one incident, oldest entry first. */
public record ThreadInput(String code, String title, String description, String status, String priority,
                          String assignee, Instant resolutionDue, String resolutionNotes, List<ThreadEntry> entries) {

    public ThreadInput {
        entries = List.copyOf(entries);
    }
}
