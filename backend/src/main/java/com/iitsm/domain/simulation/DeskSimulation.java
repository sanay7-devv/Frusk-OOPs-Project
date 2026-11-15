package com.iitsm.domain.simulation;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

import com.iitsm.domain.assignment.AssignmentEngine;
import com.iitsm.domain.assignment.ScoredCandidate;
import com.iitsm.domain.assignment.TechnicianCandidate;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.user.TechnicianProfile;
import com.iitsm.domain.user.User;

/**
 * The service desk in fast-forward (decision DEC-44, built as DEC-112): replays a list of incidents through the REAL
 * {@link AssignmentEngine} (the same eligibility filter, strategies and weights that run live) on a virtual
 * timeline, and measures what a configuration would have done. Nothing is written anywhere; the clock is a plain
 * {@link Instant} that only moves when the next event happens (a discrete-event loop over a priority queue).
 *
 * <p>Model, stated next to every result: a technician works one incident at a time, always taking the waiting
 * incident with the highest priority (then the earliest arrival), at the speed given by the
 * {@link ServiceTimeModel}. The load the strategies see is the weighted load of everything assigned to a
 * technician and not yet finished, exactly as {@code WorkloadTracker} counts it live. Familiarity with a service
 * starts at zero and grows with the incidents the technician resolves during the replay. An incident nobody is
 * eligible for waits in triage until somebody frees up.
 */
public final class DeskSimulation {

    /** One incident of the replayed workload; {@code at} is its arrival on the virtual timeline. */
    public record Arrival(Incident incident, Instant at, Duration allowed, Long realAssigneeId) {
    }

    /** A technician available during the replay. */
    public record Worker(User technician, TechnicianProfile profile) {
    }

    /** One scenario to try: a name and a settings snapshot (strategy and weights) to run the engine with. */
    public record Scenario(String name, AppSettings settings) {
    }

    /** What one technician did during the replay. */
    public record WorkerResult(Long technicianId, String name, int assigned, double busyMinutes,
                               double utilizationPercent) {
    }

    /** The measurements of one scenario. Violations count incidents finished after their allowed time. */
    public record Result(String name, int incidents, int violations, int unassigned, double meanResolveMinutes,
                         double p90ResolveMinutes, double meanWaitMinutes, double fairness,
                         double matchesRealAssigneePercent, List<WorkerResult> workers) {
    }

    private enum Kind { FINISH, ARRIVAL }

    private record Event(Instant at, Kind kind, int seq, Arrival arrival, Desk desk) {
    }

    /** The virtual clock: events in time order, a finish before an arrival at the same instant, then first come. */
    private static final class Timeline {
        private final PriorityQueue<Event> queue = new PriorityQueue<>(Comparator.comparing(Event::at)
                .thenComparing(Event::kind)
                .thenComparingInt(Event::seq));
        private int next;

        void schedule(Instant at, Kind kind, Arrival arrival, Desk desk) {
            queue.add(new Event(at, kind, next++, arrival, desk));
        }

        Event poll() {
            return queue.poll();
        }

        boolean isEmpty() {
            return queue.isEmpty();
        }
    }

    /** A technician's place in the replay: what is being served, what waits, and the running totals. */
    private static final class Desk {
        final Worker worker;
        final PriorityQueue<Arrival> waiting = new PriorityQueue<>(Comparator
                .comparingInt((Arrival a) -> -a.incident().getPriority().workloadWeight())
                .thenComparing(Arrival::at)
                .thenComparing(a -> a.incident().getId()));
        final Map<Long, Long> fixesByService = new HashMap<>();
        int load;
        Arrival serving;
        Duration busy = Duration.ZERO;
        int assigned;

        Desk(Worker worker) {
            this.worker = worker;
        }
    }

    private record Outcome(Arrival arrival, Desk desk, Instant start, Instant finish) {
    }

    private final AssignmentEngine engine;
    private final ServiceTimeModel times;

    public DeskSimulation(AssignmentEngine engine, ServiceTimeModel times) {
        this.engine = engine;
        this.times = times;
    }

    /**
     * Replays the workload with one scenario. The workers' {@code lastAssignedAt} (the round-robin memory) is moved
     * by the replay; the caller must restore it afterwards (the application service does, inside a read-only
     * transaction that never flushes).
     */
    public Result run(List<Arrival> workload, List<Worker> workers, Scenario scenario) {
        List<Desk> desks = workers.stream().map(Desk::new).toList();
        Timeline events = new Timeline();
        List<Arrival> triage = new ArrayList<>();
        List<Outcome> outcomes = new ArrayList<>();
        Map<Long, Long> chosenByIncident = new HashMap<>();
        for (Arrival arrival : workload) {
            events.schedule(arrival.at(), Kind.ARRIVAL, arrival, null);
        }
        Instant first = workload.isEmpty() ? null : workload.get(0).at();
        Instant last = first;

        while (!events.isEmpty()) {
            Event event = events.poll();
            Instant now = event.at();
            last = now.isAfter(last) ? now : last;
            if (event.kind() == Kind.ARRIVAL) {
                if (!offer(event.arrival(), desks, scenario, now, events, outcomes, chosenByIncident)) {
                    triage.add(event.arrival());
                }
            } else {
                Desk desk = event.desk();
                Arrival done = desk.serving;
                desk.load -= done.incident().getPriority().workloadWeight();
                desk.fixesByService.merge(done.incident().getService().getId(), 1L, Long::sum);
                desk.serving = null;
                startNext(desk, now, events, outcomes);
                for (Arrival waitingInTriage : List.copyOf(triage)) {
                    if (offer(waitingInTriage, desks, scenario, now, events, outcomes, chosenByIncident)) {
                        triage.remove(waitingInTriage);
                    }
                }
            }
        }
        return measure(scenario.name(), workload, desks, outcomes, triage.size(), chosenByIncident, first, last);
    }

    /** Assigns the arrival with the real engine. Returns false if nobody is eligible (it stays in triage). */
    private boolean offer(Arrival arrival, List<Desk> desks, Scenario scenario, Instant now,
                          Timeline events, List<Outcome> outcomes, Map<Long, Long> chosenByIncident) {
        Incident incident = arrival.incident();
        Long serviceId = incident.getService().getId();
        Map<TechnicianCandidate, Desk> byCandidate = new IdentityHashMap<>();
        List<TechnicianCandidate> candidates = new ArrayList<>();
        for (Desk desk : desks) {
            TechnicianCandidate candidate = new TechnicianCandidate(desk.worker.technician(), desk.worker.profile(),
                    desk.load, desk.fixesByService.getOrDefault(serviceId, 0L));
            byCandidate.put(candidate, desk);
            candidates.add(candidate);
        }
        var best = engine.recommend(incident, candidates, scenario.settings()).best().map(ScoredCandidate::candidate);
        if (best.isEmpty()) {
            return false;
        }
        Desk chosen = byCandidate.get(best.get());
        chosen.load += incident.getPriority().workloadWeight();
        chosen.assigned++;
        chosen.worker.profile().markAssigned(now);
        chosenByIncident.put(incident.getId(), chosen.worker.technician().getId());
        chosen.waiting.add(arrival);
        if (chosen.serving == null) {
            startNext(chosen, now, events, outcomes);
        }
        return true;
    }

    private void startNext(Desk desk, Instant now, Timeline events, List<Outcome> outcomes) {
        Arrival next = desk.waiting.poll();
        if (next == null) {
            return;
        }
        Duration handling = times.handlingTime(next.incident().getPriority(),
                desk.worker.profile().getExperienceLevel());
        desk.serving = next;
        desk.busy = desk.busy.plus(handling);
        Instant finish = now.plus(handling);
        outcomes.add(new Outcome(next, desk, now, finish));
        events.schedule(finish, Kind.FINISH, next, desk);
    }

    private Result measure(String name, List<Arrival> workload, List<Desk> desks, List<Outcome> outcomes,
                           int unassigned, Map<Long, Long> chosenByIncident, Instant first, Instant last) {
        List<Double> resolveMinutes = new ArrayList<>();
        double waitTotal = 0;
        int violations = unassigned;
        for (Outcome outcome : outcomes) {
            double resolve = Duration.between(outcome.arrival().at(), outcome.finish()).toSeconds() / 60.0;
            resolveMinutes.add(resolve);
            waitTotal += Duration.between(outcome.arrival().at(), outcome.start()).toSeconds() / 60.0;
            Duration allowed = outcome.arrival().allowed();
            if (allowed != null && Duration.between(outcome.arrival().at(), outcome.finish()).compareTo(allowed) > 0) {
                violations++;
            }
        }
        int withRealAssignee = 0;
        int sameAsReal = 0;
        for (Arrival arrival : workload) {
            Long chosen = chosenByIncident.get(arrival.incident().getId());
            if (arrival.realAssigneeId() != null && chosen != null) {
                withRealAssignee++;
                if (arrival.realAssigneeId().equals(chosen)) {
                    sameAsReal++;
                }
            }
        }
        double span = first == null ? 0 : Math.max(1, Duration.between(first, last).toSeconds() / 60.0);
        List<WorkerResult> workerResults = desks.stream()
                .map(d -> new WorkerResult(d.worker.technician().getId(), d.worker.technician().getName(), d.assigned,
                        round(d.busy.toSeconds() / 60.0), round(Math.min(100, d.busy.toSeconds() / 60.0 / span * 100))))
                .toList();
        return new Result(name, workload.size(), violations, unassigned, round(mean(resolveMinutes)),
                round(percentile(resolveMinutes, 0.9)), round(outcomes.isEmpty() ? 0 : waitTotal / outcomes.size()),
                round(fairness(desks)), round(withRealAssignee == 0 ? 0 : 100.0 * sameAsReal / withRealAssignee),
                workerResults);
    }

    /** Jain's fairness index over incidents per technician: 1.0 is perfectly even, 1/n is one person doing it all. */
    private static double fairness(List<Desk> desks) {
        double sum = 0;
        double squares = 0;
        for (Desk desk : desks) {
            sum += desk.assigned;
            squares += (double) desk.assigned * desk.assigned;
        }
        return squares == 0 ? 0 : sum * sum / (desks.size() * squares);
    }

    private static double mean(List<Double> values) {
        return values.isEmpty() ? 0 : values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
    }

    private static double percentile(List<Double> values, double p) {
        if (values.isEmpty()) {
            return 0;
        }
        List<Double> sorted = values.stream().sorted().toList();
        return sorted.get(Math.max(0, (int) Math.ceil(p * sorted.size()) - 1));
    }

    private static double round(double value) {
        return Math.round(value * 100) / 100.0;
    }
}
