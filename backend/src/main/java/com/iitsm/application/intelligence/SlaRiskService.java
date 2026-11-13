package com.iitsm.application.intelligence;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.intelligence.IntelligenceViews.RiskFactorView;
import com.iitsm.application.intelligence.IntelligenceViews.SlaRiskView;
import com.iitsm.domain.assignment.WorkloadTracker;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.event.SlaAtRisk;
import com.iitsm.domain.exception.SlaNotConfiguredException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.intelligence.SimilarMatch;
import com.iitsm.domain.intelligence.SlaRiskScorer;
import com.iitsm.domain.intelligence.TextAnalysisService;
import com.iitsm.domain.intelligence.TextRecord;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.IncidentTextRepository;
import com.iitsm.domain.sla.AlwaysCalendar;
import com.iitsm.domain.sla.SlaPolicyResolver;
import com.iitsm.domain.sla.SlaTargets;
import com.iitsm.domain.sla.WorkCalendar;
import com.iitsm.domain.user.User;

/**
 * SLA risk (handbook 1.7, 2.5 M12): a heuristic score from 0 to 1, computed on read for one incident and by a
 * scheduled scan of every incident being worked on. The scan checks each incident in its own transaction, logs and
 * publishes {@link SlaAtRisk} once when an incident first reaches the flag threshold, and is harmless to repeat: an
 * incident that is already flagged is not announced again until it has dropped below the threshold and risen again.
 * Weights, threshold and interval are live settings.
 */
@Service
public class SlaRiskService {

    private static final Logger log = LoggerFactory.getLogger(SlaRiskService.class);
    private static final int HISTORY_SAMPLES = 200;
    private static final int HISTORY_MATCHES = 5;
    private static final double NEUTRAL = 0.5;

    /** What one scan did, for the log and for tests. */
    public record ScanResult(int checked, int newlyFlagged, int atRisk, int failed) {
    }

    private record Sample(TextRecord text, Instant createdAt, Instant resolvedAt) {
    }

    private final IncidentRepository incidents;
    private final IncidentTextRepository texts;
    private final IntelligenceReader reader;
    private final TextAnalysisService analysis;
    private final SlaPolicyResolver slaPolicies;
    private final ConfigService config;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate transaction;
    private final Clock clock;
    private final Map<Long, Instant> flagged = new ConcurrentHashMap<>();

    SlaRiskService(IncidentRepository incidents, IncidentTextRepository texts, IntelligenceReader reader,
                   TextAnalysisService analysis, SlaPolicyResolver slaPolicies, ConfigService config,
                   ApplicationEventPublisher events, PlatformTransactionManager transactions, Clock clock) {
        this.incidents = incidents;
        this.texts = texts;
        this.reader = reader;
        this.analysis = analysis;
        this.slaPolicies = slaPolicies;
        this.config = config;
        this.events = events;
        this.transaction = new TransactionTemplate(transactions);
        this.clock = clock;
    }

    /** GET /incidents/{id}/sla-risk (assignee, team lead, admin). */
    @Transactional(readOnly = true)
    public SlaRiskView risk(AuthenticatedUser caller, Long id) {
        Incident incident = reader.loadStaff(caller, id);
        AppSettings settings = config.current();
        SlaRiskScorer.Score score = compute(incident, settings, clock.instant(), null);
        return view(score, settings);
    }

    /** The scheduled scan: scores every incident being worked on and flags those at or above the threshold. */
    public ScanResult scanOnce() {
        List<Long> candidates = incidents.findSlaMonitorCandidates(IncidentStatus.ACTIVE_WORK);
        flagged.keySet().removeIf(id -> !candidates.contains(id));
        Map<Long, List<Sample>> samplesByService = new HashMap<>();
        int fresh = 0;
        int failed = 0;
        for (Long id : candidates) {
            try {
                Boolean isNew = transaction.execute(status -> check(id, samplesByService));
                if (Boolean.TRUE.equals(isNew)) {
                    fresh++;
                }
            } catch (RuntimeException ex) {
                failed++;
                log.warn("SLA risk check of incident {} failed, retrying next scan: {}", id, ex.toString());
            }
        }
        return new ScanResult(candidates.size(), fresh, flagged.size(), failed);
    }

    private boolean check(Long id, Map<Long, List<Sample>> samplesByService) {
        Incident incident = incidents.findById(id).orElse(null);
        if (incident == null) {
            flagged.remove(id);
            return false;
        }
        AppSettings settings = config.current();
        Instant now = clock.instant();
        SlaRiskScorer.Score score = compute(incident, settings, now, samplesByService);
        if (!score.atRisk()) {
            flagged.remove(id);
            return false;
        }
        if (flagged.putIfAbsent(id, now) != null) {
            return false;
        }
        User assignee = incident.getAssignee();
        events.publishEvent(new SlaAtRisk(incident.getId(), incident.getCode(), incident.getPriority(),
                score.score(), assignee == null ? null : assignee.getId(), now));
        log.info("SLA at risk: {} {} score {} ({})", incident.getCode(), incident.getPriority(), score.score(),
                score.factors().stream().map(f -> f.name() + "=" + f.contribution())
                        .collect(java.util.stream.Collectors.joining(", ")));
        return true;
    }

    // ------------------------------------------------------------------ the heuristic

    /** Must run inside a transaction (reads the incident's service, assignee and workload). */
    SlaRiskScorer.Score compute(Incident incident, AppSettings settings, Instant now,
                                Map<Long, List<Sample>> samplesByService) {
        if (incident.getStatus().isResolvedOrLater()) {
            return SlaRiskScorer.finished("The incident is resolved; no SLA clock is running.");
        }
        if (incident.getPriority() == null || incident.getSla().getResolutionDue() == null) {
            return SlaRiskScorer.finished("No SLA deadline is set yet.");
        }
        SlaTargets targets = targetsOf(incident, settings);
        WorkCalendar calendar = targets != null ? targets.calendar() : AlwaysCalendar.INSTANCE;
        Instant due = incident.getSla().getResolutionDue();
        Duration target = targets != null ? targets.resolution() : Duration.between(incident.getCreatedAt(), due);

        // 1. elapsed share of the resolution time (a paused clock stops at the moment it was paused)
        Instant reference = incident.getSla().isPaused() && incident.getSla().getPausedAt() != null
                ? incident.getSla().getPausedAt() : now;
        double elapsed = target.isZero() ? 1.0
                : 1.0 - (double) calendar.workingTimeBetween(reference, due).toSeconds() / target.toSeconds();
        String elapsedDetail = String.format("%.0f%% of the %s resolution time has elapsed%s",
                Math.max(0, Math.min(1, elapsed)) * 100, format(target),
                incident.getSla().isPaused() ? " (clock paused)" : "");

        // 2. the assigned technician's load ratio; nobody assigned counts as fully loaded
        double load;
        String loadDetail;
        User assignee = incident.getAssignee();
        if (assignee == null) {
            load = 1.0;
            loadDetail = "Nobody is assigned yet.";
        } else {
            int current = WorkloadTracker.loadOf(
                    incidents.findByAssignee_IdAndStatusIn(assignee.getId(), IncidentStatus.ACTIVE_WORK));
            int max = assignee.technicianRole().map(role -> role.getProfile().getMaxLoad()).orElse(0);
            load = max > 0 ? (double) current / max : NEUTRAL;
            loadDetail = max > 0 ? assignee.getName() + " carries " + current + " of " + max + " load points."
                    : assignee.getName() + " has no technician workload limit.";
        }

        // 3. priority
        double priority = SlaRiskScorer.priorityRatio(incident.getPriority().ordinal());
        String priorityDetail = incident.getPriority().displayName() + ".";

        // 4. how long similar past incidents took against the target
        double history = NEUTRAL;
        String historyDetail = "No similar resolved incident to compare with.";
        List<Sample> samples = samplesByService == null ? loadSamples(incident, now)
                : samplesByService.computeIfAbsent(incident.getService().getId(), sid -> loadSamples(incident, now));
        List<Sample> others = samples.stream().filter(s -> !s.text().id().equals(incident.getId())).toList();
        if (!others.isEmpty() && !target.isZero()) {
            double minimum = settings.decimalValue(ConfigKey.RESOLUTION_MIN_SIMILARITY).doubleValue();
            Map<Long, Sample> byId = new HashMap<>();
            others.forEach(s -> byId.put(s.text().id(), s));
            List<SimilarMatch> matches = analysis.findSimilar(incident.getTitle(), incident.getDescription(),
                    others.stream().map(Sample::text).toList(), reader.corpus()).stream()
                    .filter(m -> m.similarity() >= minimum).limit(HISTORY_MATCHES).toList();
            if (!matches.isEmpty()) {
                List<Duration> taken = new ArrayList<>();
                for (SimilarMatch match : matches) {
                    Sample sample = byId.get(match.id());
                    taken.add(calendar.workingTimeBetween(sample.createdAt(), sample.resolvedAt()));
                }
                double averageSeconds = taken.stream().mapToLong(Duration::toSeconds).average().orElse(0);
                history = averageSeconds / target.toSeconds();
                historyDetail = String.format("%d similar resolved incident(s) took %s on average, %.0f%% of the target.",
                        matches.size(), format(Duration.ofSeconds((long) averageSeconds)), history * 100);
            }
        }

        SlaRiskScorer.Inputs inputs = new SlaRiskScorer.Inputs(elapsed, elapsedDetail, load, loadDetail, priority,
                priorityDetail, history, historyDetail);
        SlaRiskScorer.Weights weights = new SlaRiskScorer.Weights(
                settings.decimalValue(ConfigKey.SLA_RISK_WEIGHT_ELAPSED).doubleValue(),
                settings.decimalValue(ConfigKey.SLA_RISK_WEIGHT_LOAD).doubleValue(),
                settings.decimalValue(ConfigKey.SLA_RISK_WEIGHT_PRIORITY).doubleValue(),
                settings.decimalValue(ConfigKey.SLA_RISK_WEIGHT_HISTORY).doubleValue());
        return SlaRiskScorer.score(inputs, weights, settings.decimalValue(ConfigKey.SLA_RISK_THRESHOLD).doubleValue());
    }

    private SlaTargets targetsOf(Incident incident, AppSettings settings) {
        try {
            return slaPolicies.resolve(incident.getService(), incident.getPriority()).targets(settings);
        } catch (SlaNotConfiguredException ex) {
            return null;
        }
    }

    private List<Sample> loadSamples(Incident incident, Instant now) {
        Instant since = now.minus(Duration.ofDays(IntelligenceReader.RESOLVED_LOOKBACK_DAYS));
        return texts.findResolved(incident.getService().getId(), since, HISTORY_SAMPLES).stream()
                .filter(past -> past.getResolvedAt() != null)
                .map(past -> new Sample(new TextRecord(past.getId(), past.getTitle(),
                        past.getDescription() + " " + past.getResolution().getRootCause()),
                        past.getCreatedAt(), past.getResolvedAt()))
                .toList();
    }

    private SlaRiskView view(SlaRiskScorer.Score score, AppSettings settings) {
        return new SlaRiskView(score.score(), score.level(), score.atRisk(),
                settings.decimalValue(ConfigKey.SLA_RISK_THRESHOLD).doubleValue(),
                score.factors().stream()
                        .map(f -> new RiskFactorView(f.name(), f.contribution(), f.detail())).toList());
    }

    private static String format(Duration duration) {
        long minutes = duration.toMinutes();
        return minutes >= 60 ? (minutes / 60) + "h " + (minutes % 60) + "m" : minutes + "m";
    }
}
