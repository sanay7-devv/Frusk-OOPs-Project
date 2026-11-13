package com.iitsm.application.notification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

/**
 * Holds the SLA warnings of one monitor run until the run is over, so they can be sent one by one or, when one person
 * would get too many, as one digest (alert storm control, decision DEC-42). Only the notification thread touches it,
 * but the methods are synchronized anyway.
 */
@Component
public class DigestCollector {

    private final Map<Long, List<NotificationRequest>> byPerson = new LinkedHashMap<>();
    private Instant oldest;

    public synchronized void add(NotificationRequest request, Instant now) {
        byPerson.computeIfAbsent(request.recipient().id(), id -> new ArrayList<>()).add(request);
        if (oldest == null) {
            oldest = now;
        }
    }

    /** When the oldest held warning arrived, so a run that never reports its end cannot hold warnings forever. */
    public synchronized Optional<Instant> oldest() {
        return Optional.ofNullable(oldest);
    }

    /** Hands over everything held and empties the collector. */
    public synchronized Map<Long, List<NotificationRequest>> drain() {
        Map<Long, List<NotificationRequest>> taken = new LinkedHashMap<>(byPerson);
        byPerson.clear();
        oldest = null;
        return taken;
    }
}
