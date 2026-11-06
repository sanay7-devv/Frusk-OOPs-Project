package com.iitsm.application.assignment;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.iitsm.application.assignment.WorkloadService.Workload;
import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.assignment.AssignmentEngine;
import com.iitsm.domain.assignment.AssignmentEngine.Recommendation;
import com.iitsm.domain.assignment.ScoredCandidate;
import com.iitsm.domain.assignment.TechnicianCandidate;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.TechnicianRole;
import com.iitsm.domain.user.User;

/**
 * Module M6: picks technicians for incidents. Gathers every technician with their current load and recent fixes on
 * the incident's service, lets the {@link AssignmentEngine} filter and rank them with the active strategy, and
 * either assigns the best one or reports who was excluded and why. Runs inside the caller's transaction.
 */
@Service
public class AssignmentService {

    /** One recommended technician (API Data Dictionary C.5 Recommendation, plus per-factor scores). */
    public record RecommendedTechnician(Long technicianId, String name, int score, int currentLoad, int maxLoad,
                                        List<String> reasons, Map<String, Double> factors) {
    }

    public record ExcludedTechnician(Long technicianId, String name, String reason) {
    }

    /** GET /incidents/{id}/recommendations (decision DEC-30: top 3, factor breakdown, excluded with reasons). */
    public record RecommendationView(String strategy, List<RecommendedTechnician> recommendations,
                                     List<ExcludedTechnician> excluded) {
    }

    private static final int TOP = 3;

    private final UserRepository users;
    private final IncidentRepository incidents;
    private final WorkloadService workloads;
    private final AssignmentEngine engine;
    private final ConfigService config;
    private final Clock clock;

    public AssignmentService(UserRepository users, IncidentRepository incidents, WorkloadService workloads,
                             AssignmentEngine engine, ConfigService config, Clock clock) {
        this.users = users;
        this.incidents = incidents;
        this.workloads = workloads;
        this.engine = engine;
        this.config = config;
        this.clock = clock;
    }

    /**
     * Assigns the best eligible technician with the active strategy. An incident without a category stays in
     * triage (nothing to match skills against); if nobody is eligible it stays CLASSIFIED for a team lead.
     *
     * @return the technician chosen, or empty if the incident stays in triage
     */
    public Optional<User> autoAssign(Incident incident) {
        if (incident.getCategory() == null) {
            return Optional.empty();
        }
        Optional<ScoredCandidate> best = recommend(incident).best();
        best.ifPresent(choice -> assign(incident, choice.candidate().technician()));
        return best.map(choice -> choice.candidate().technician());
    }

    /** The full ranking for one incident with the active strategy. */
    public Recommendation recommend(Incident incident) {
        AppSettings settings = config.current();
        return engine.recommend(incident, candidates(incident, settings), settings);
    }

    public RecommendationView recommendationView(Incident incident) {
        Recommendation recommendation = recommend(incident);
        List<RecommendedTechnician> top = recommendation.ranked().stream()
                .limit(TOP)
                .map(c -> new RecommendedTechnician(c.candidate().technician().getId(),
                        c.candidate().technician().getName(), c.percent(), c.candidate().currentLoad(),
                        c.candidate().profile().getMaxLoad(), c.factors().reasons(), c.factors().asMap()))
                .toList();
        List<ExcludedTechnician> excluded = recommendation.excluded().stream()
                .map(e -> new ExcludedTechnician(e.technician().getId(), e.technician().getName(), e.reason()))
                .toList();
        return new RecommendationView(recommendation.strategy(), top, excluded);
    }

    /** Gives the incident to the technician and records the time for round-robin. */
    public void assign(Incident incident, User technician) {
        Instant now = clock.instant();
        incident.assign(technician, now);
        technician.technicianRole().ifPresent(role -> role.getProfile().markAssigned(now));
    }

    private List<TechnicianCandidate> candidates(Incident incident, AppSettings settings) {
        Map<Long, Workload> loads = workloads.all();
        Instant since = clock.instant()
                .minus(Duration.ofDays(settings.intValue(ConfigKey.ASSIGNMENT_FAMILIARITY_WINDOW_DAYS)));
        List<TechnicianCandidate> candidates = new ArrayList<>();
        for (User user : users.findAllTechnicians()) {
            TechnicianRole role = user.technicianRole().orElseThrow();
            long fixes = incidents.countByAssignee_IdAndService_IdAndResolvedAtAfter(
                    user.getId(), incident.getService().getId(), since);
            candidates.add(new TechnicianCandidate(user, role.getProfile(),
                    loads.getOrDefault(user.getId(), Workload.NONE).load(), fixes));
        }
        return candidates;
    }
}
