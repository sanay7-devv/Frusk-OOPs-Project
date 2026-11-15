package com.iitsm.application.simulation;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.assignment.AssignmentEngine;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.incident.ClosureReason;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentQuery;
import com.iitsm.domain.repository.IncidentSearch;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.simulation.DeskSimulation;
import com.iitsm.domain.simulation.DeskSimulation.Arrival;
import com.iitsm.domain.simulation.DeskSimulation.Scenario;
import com.iitsm.domain.simulation.DeskSimulation.Worker;
import com.iitsm.domain.simulation.ServiceTimeModel;
import com.iitsm.domain.user.TechnicianRole;
import com.iitsm.domain.user.User;

/**
 * The Service Desk Simulator (S1, decision DEC-112): replays the last N real incidents through the real assignment
 * engine under up to three configurations and compares what each would have done. Everything runs in memory inside
 * a read-only transaction, so nothing is written, no audit entry is created and no notification is sent. The only
 * state the replay touches is the round-robin memory of each technician, which is restored after every scenario.
 */
@Service
public class SimulatorService {

    public static final int DEFAULT_INCIDENTS = 100;
    public static final int MAX_CONFIGURATIONS = 3;

    /** What the admin asks to try. Null means "the current setting". */
    public record ConfigurationSpec(String name, String strategy, Map<String, Double> weights, Integer technicians) {
    }

    public record WorkloadView(int incidents, Instant from, Instant to, double speedUp, Map<String, Integer> excluded) {
    }

    public record ConfigurationView(String name, String strategy, Map<String, String> weights, int technicians,
                                    int incidents, int slaViolations, double slaViolationPercent, int unassigned,
                                    double meanResolveMinutes, double p90ResolveMinutes, double meanWaitMinutes,
                                    double fairness, double matchesRealAssigneePercent,
                                    List<DeskSimulation.WorkerResult> perTechnician) {
    }

    public record SimulationView(WorkloadView workload, List<String> assumptions, List<ConfigurationView> results,
                                 String best, String bestReason) {
    }

    private static final Map<String, ConfigKey> WEIGHT_KEYS = new LinkedHashMap<>();

    static {
        WEIGHT_KEYS.put("skill", ConfigKey.ASSIGNMENT_WEIGHT_SKILL);
        WEIGHT_KEYS.put("load", ConfigKey.ASSIGNMENT_WEIGHT_LOAD);
        WEIGHT_KEYS.put("experience", ConfigKey.ASSIGNMENT_WEIGHT_EXPERIENCE);
        WEIGHT_KEYS.put("priorityFit", ConfigKey.ASSIGNMENT_WEIGHT_PRIORITY);
        WEIGHT_KEYS.put("familiarity", ConfigKey.ASSIGNMENT_WEIGHT_FAMILIARITY);
    }

    private final IncidentSearch search;
    private final UserRepository users;
    private final AssignmentEngine engine;
    private final ConfigService config;

    public SimulatorService(IncidentSearch search, UserRepository users, AssignmentEngine engine,
                            ConfigService config) {
        this.search = search;
        this.users = users;
        this.engine = engine;
        this.config = config;
    }

    @Transactional(readOnly = true)
    public SimulationView simulate(Integer lastIncidents, Double speedUp, List<ConfigurationSpec> specs) {
        int count = lastIncidents == null ? DEFAULT_INCIDENTS : lastIncidents;
        double factor = speedUp == null ? 1.0 : speedUp;
        List<ConfigurationSpec> requested = specs == null || specs.isEmpty()
                ? List.of(new ConfigurationSpec("Current settings", null, null, null))
                : specs;
        if (requested.size() > MAX_CONFIGURATIONS) {
            throw new InputValidationException("configurations", "at most " + MAX_CONFIGURATIONS + " at a time");
        }
        AppSettings current = config.current();
        List<Scenario> scenarios = new ArrayList<>();
        Map<String, Integer> limits = new HashMap<>();
        for (int i = 0; i < requested.size(); i++) {
            ConfigurationSpec spec = requested.get(i);
            String name = spec.name() == null || spec.name().isBlank() ? "Configuration " + (i + 1) : spec.name().strip();
            scenarios.add(new Scenario(name, settingsFor(current, spec)));
            limits.put(name, spec.technicians() == null ? Integer.MAX_VALUE : spec.technicians());
        }

        Map<String, Integer> excluded = new LinkedHashMap<>();
        List<Incident> history = new ArrayList<>(search.search(new IncidentQuery(null, null, null, null, null, null,
                null, null, null, null, null, 0, count, "createdAt", false)).items());
        Collections.reverse(history);
        List<Incident> replayed = new ArrayList<>();
        for (Incident incident : history) {
            if (incident.getClosureReason() == ClosureReason.DUPLICATE
                    || incident.getClosureReason() == ClosureReason.WITHDRAWN) {
                excluded.merge("closed as duplicate or withdrawn", 1, Integer::sum);
            } else if (incident.getPriority() == null || incident.getCategory() == null) {
                excluded.merge("no priority or category yet", 1, Integer::sum);
            } else {
                replayed.add(incident);
            }
        }

        ServiceTimeModel times = ServiceTimeModel.fromHistory(replayed);
        List<Arrival> workload = arrivals(replayed, factor);
        List<Worker> everyone = users.findAllTechnicians().stream()
                .sorted(Comparator.comparing(User::getId))
                .map(user -> new Worker(user, user.technicianRole().map(TechnicianRole::getProfile).orElseThrow()))
                .toList();
        Map<Long, Instant> roundRobinMemory = new HashMap<>();
        everyone.forEach(w -> roundRobinMemory.put(w.technician().getId(), w.profile().getLastAssignedAt()));

        DeskSimulation simulation = new DeskSimulation(engine, times);
        List<ConfigurationView> results = new ArrayList<>();
        try {
            for (Scenario scenario : scenarios) {
                int limit = limits.get(scenario.name());
                List<Worker> workers = everyone.stream().limit(limit).toList();
                DeskSimulation.Result result = simulation.run(workload, workers, scenario);
                results.add(view(scenario, result, workers.size()));
                everyone.forEach(w -> w.profile().markAssigned(roundRobinMemory.get(w.technician().getId())));
            }
        } finally {
            everyone.forEach(w -> w.profile().markAssigned(roundRobinMemory.get(w.technician().getId())));
        }

        WorkloadView view = new WorkloadView(replayed.size(),
                replayed.isEmpty() ? null : replayed.get(0).getCreatedAt(),
                replayed.isEmpty() ? null : replayed.get(replayed.size() - 1).getCreatedAt(), factor, excluded);
        return new SimulationView(view, assumptions(times, factor), results, bestOf(results),
                "fewest SLA violations, then the lowest mean time to resolve");
    }

    /** Writes a configuration to the live settings (the "Apply" button); audited as CONFIG_CHANGED by ConfigService. */
    @Transactional
    public void apply(Long actorId, ConfigurationSpec spec) {
        Map<String, String> changes = new LinkedHashMap<>();
        if (spec.strategy() != null) {
            changes.put(ConfigKey.ASSIGNMENT_STRATEGY.key(), spec.strategy());
        }
        weightChanges(spec).forEach((key, value) -> changes.put(key.key(), value));
        if (changes.isEmpty()) {
            throw new InputValidationException("strategy", "give a strategy or at least one weight to apply");
        }
        config.update(actorId, changes);
    }

    private static AppSettings settingsFor(AppSettings current, ConfigurationSpec spec) {
        Map<String, String> values = new HashMap<>();
        current.asMap().forEach((key, value) -> values.put(key.key(), value));
        if (spec.strategy() != null) {
            values.put(ConfigKey.ASSIGNMENT_STRATEGY.key(), spec.strategy());
        }
        weightChanges(spec).forEach((key, value) -> values.put(key.key(), value));
        return AppSettings.from(values);
    }

    private static Map<ConfigKey, String> weightChanges(ConfigurationSpec spec) {
        Map<ConfigKey, String> changes = new LinkedHashMap<>();
        if (spec.weights() == null) {
            return changes;
        }
        spec.weights().forEach((name, value) -> {
            ConfigKey key = WEIGHT_KEYS.get(name);
            if (key == null) {
                throw new InputValidationException("weights." + name, "unknown weight; use "
                        + String.join(", ", WEIGHT_KEYS.keySet()));
            }
            changes.put(key, BigDecimal.valueOf(value).stripTrailingZeros().toPlainString());
        });
        return changes;
    }

    private static List<Arrival> arrivals(List<Incident> replayed, double speedUp) {
        if (replayed.isEmpty()) {
            return List.of();
        }
        Instant first = replayed.get(0).getCreatedAt();
        List<Arrival> arrivals = new ArrayList<>();
        for (Incident incident : replayed) {
            long offset = Math.round(Duration.between(first, incident.getCreatedAt()).toMillis() / speedUp);
            Instant due = incident.getSla().getResolutionDue();
            Duration allowed = due == null ? null : Duration.between(incident.getCreatedAt(), due);
            if (allowed != null && allowed.isNegative()) {
                allowed = null;
            }
            arrivals.add(new Arrival(incident, first.plusMillis(offset), allowed,
                    incident.getAssignee() == null ? null : incident.getAssignee().getId()));
        }
        return arrivals;
    }

    private ConfigurationView view(Scenario scenario, DeskSimulation.Result r, int technicians) {
        AppSettings s = scenario.settings();
        Map<String, String> weights = new LinkedHashMap<>();
        WEIGHT_KEYS.forEach((name, key) -> weights.put(name, s.raw(key)));
        double percent = r.incidents() == 0 ? 0 : Math.round(r.violations() * 10000.0 / r.incidents()) / 100.0;
        return new ConfigurationView(scenario.name(), s.assignmentStrategy(), weights, technicians, r.incidents(),
                r.violations(), percent, r.unassigned(), r.meanResolveMinutes(), r.p90ResolveMinutes(),
                r.meanWaitMinutes(), r.fairness(), r.matchesRealAssigneePercent(), r.workers());
    }

    private static String bestOf(List<ConfigurationView> results) {
        return results.stream()
                .min(Comparator.comparingInt(ConfigurationView::slaViolations)
                        .thenComparingDouble(ConfigurationView::meanResolveMinutes))
                .map(ConfigurationView::name).orElse(null);
    }

    private static List<String> assumptions(ServiceTimeModel times, double speedUp) {
        List<String> lines = new ArrayList<>();
        lines.add("This is a model, not a forecast: each technician works one incident at a time, highest priority "
                + "first, at the speed below; real technicians multitask and take breaks.");
        lines.add("Handling time per priority is learned from the replayed incidents. " + String.join("; ", times.describe())
                + ".");
        lines.add("Experience changes speed: level 1 takes 20% longer than the base, level 3 the base, level 5 20% less.");
        lines.add("The allowed time of an incident is the gap between its creation and its real resolution deadline, "
                + "counted on the wall clock (business-hours calendars are not applied).");
        lines.add("Technician availability and maximum load are today's values. Load starts empty; familiarity with a "
                + "service starts at zero and grows as the replay resolves incidents.");
        lines.add(speedUp > 1 ? "Arrivals are compressed " + speedUp + " times to simulate an outage storm; deadlines "
                + "are not." : "Arrivals keep their real spacing.");
        lines.add("Incidents closed as duplicates or withdrawn, and ones without a priority or category, are left out.");
        lines.add("\"Matches real assignee\" is how often the simulated choice equals the technician who really got "
                + "the incident; it is below 100% because availability and load were different back then.");
        return lines;
    }
}
