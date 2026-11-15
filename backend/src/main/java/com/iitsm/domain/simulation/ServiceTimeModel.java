package com.iitsm.domain.simulation;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.priority.Priority;

/**
 * How long a technician needs for one incident in the desk simulation (decision DEC-112). The base is the median
 * handling time per priority seen in the replayed history (acknowledged to resolved, or created to resolved when
 * nobody acknowledged it); a priority with no history falls back to a fixed value. A more experienced technician is
 * faster: the base is multiplied by 1.3 minus 0.1 times the experience level, so level 1 takes 20% longer than
 * the base, level 3 exactly the base, level 5 20% less.
 */
public final class ServiceTimeModel {

    private static final Map<Priority, Long> FALLBACK_MINUTES = Map.of(
            Priority.P1, 45L, Priority.P2, 90L, Priority.P3, 180L, Priority.P4, 240L);

    private final Map<Priority, Long> baseMinutes;
    private final Map<Priority, Integer> samples;

    private ServiceTimeModel(Map<Priority, Long> baseMinutes, Map<Priority, Integer> samples) {
        this.baseMinutes = baseMinutes;
        this.samples = samples;
    }

    /** Learns the base handling time per priority from incidents that were resolved in the replayed history. */
    public static ServiceTimeModel fromHistory(Collection<Incident> history) {
        Map<Priority, List<Long>> observed = new EnumMap<>(Priority.class);
        for (Incident incident : history) {
            if (incident.getPriority() == null || incident.getResolvedAt() == null) {
                continue;
            }
            var from = incident.getAcknowledgedAt() != null ? incident.getAcknowledgedAt() : incident.getCreatedAt();
            long minutes = Duration.between(from, incident.getResolvedAt()).toMinutes();
            if (minutes > 0) {
                observed.computeIfAbsent(incident.getPriority(), p -> new ArrayList<>()).add(minutes);
            }
        }
        Map<Priority, Long> base = new EnumMap<>(Priority.class);
        Map<Priority, Integer> counts = new EnumMap<>(Priority.class);
        for (Priority priority : Priority.values()) {
            List<Long> values = observed.getOrDefault(priority, List.of());
            counts.put(priority, values.size());
            base.put(priority, values.isEmpty() ? FALLBACK_MINUTES.get(priority) : median(values));
        }
        return new ServiceTimeModel(base, counts);
    }

    /** Time this technician needs for an incident of the priority. Never less than one minute. */
    public Duration handlingTime(Priority priority, int experienceLevel) {
        double factor = 1.3 - 0.1 * experienceLevel;
        return Duration.ofSeconds(Math.max(60, Math.round(baseMinutes.get(priority) * factor * 60)));
    }

    /** One line per priority for the "assumptions" shown next to the results. */
    public List<String> describe() {
        List<String> lines = new ArrayList<>();
        for (Priority priority : Priority.values()) {
            int count = samples.get(priority);
            lines.add(priority + ": " + baseMinutes.get(priority) + " min base handling time ("
                    + (count == 0 ? "no history, fixed default" : "median of " + count + " resolved incidents") + ")");
        }
        return lines;
    }

    private static long median(List<Long> values) {
        List<Long> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        int middle = sorted.size() / 2;
        return sorted.size() % 2 == 1 ? sorted.get(middle) : (sorted.get(middle - 1) + sorted.get(middle)) / 2;
    }
}
