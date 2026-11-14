package com.iitsm.application.problem;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentEventPublisher;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentFact;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.problem.ProblemRecord;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.IncidentTextRepository;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.repository.ProblemRepository;
import com.iitsm.domain.service.ItService;

/**
 * Decides whether a new incident belongs to a problem record and groups it (decision DEC-71, handbook M12
 * "Correlation"). Two rules, tried in this order:
 * <ol>
 *   <li><b>Same service, similar text:</b> an open incident on the same service resembles it at the "related"
 *       threshold or more (the matches come from the duplicate check).</li>
 *   <li><b>Neighbouring service, same outage:</b> the incident is P1 to P3, and an open P1 or P2 reported on a service
 *       it depends on, or that depends on it, no longer ago than {@code problem.correlation.window.minutes}.</li>
 * </ol>
 * The anchor incident's problem record is joined, or a new one is opened with the anchor's title and service. Every
 * grouping is audited on each incident that changed (DUPLICATE_LINKED, no actor: the system did it, DEC-42).
 */
@Service
public class ProblemCorrelator {

    private static final Logger log = LoggerFactory.getLogger(ProblemCorrelator.class);
    private static final Set<Priority> ANCHOR_PRIORITIES = EnumSet.of(Priority.P1, Priority.P2);

    private final IncidentRepository incidents;
    private final IncidentTextRepository texts;
    private final ItServiceRepository services;
    private final ProblemRepository problems;
    private final IncidentEventPublisher publisher;
    private final ConfigService config;
    private final Clock clock;

    public ProblemCorrelator(IncidentRepository incidents, IncidentTextRepository texts, ItServiceRepository services,
                             ProblemRepository problems,
                             IncidentEventPublisher publisher, ConfigService config, Clock clock) {
        this.incidents = incidents;
        this.texts = texts;
        this.services = services;
        this.problems = problems;
        this.publisher = publisher;
        this.config = config;
        this.clock = clock;
    }

    /**
     * @param similarIds ids of open incidents on the same service that resemble the new one, best first
     * @return the problem record the incident now belongs to, if any
     */
    @Transactional
    public Optional<Long> correlate(Long incidentId, List<Long> similarIds) {
        Incident incident = incidents.findById(incidentId).orElseThrow();
        if (incident.getProblemId() != null || !incident.getStatus().isEditable()) {
            return Optional.ofNullable(incident.getProblemId());
        }
        Optional<Anchor> anchor = byText(incident, similarIds).or(() -> byGraph(incident));
        if (anchor.isEmpty()) {
            return Optional.empty();
        }
        Anchor found = anchor.get();
        Instant now = clock.instant();
        ProblemRecord problem = problemOf(found.incident(), now);
        if (problem == null) {
            return Optional.empty(); // the anchor's problem is already resolved: this one is new work
        }
        incident.joinProblem(problem.getId(), now);
        publishFacts(incident, "Grouped under problem record #" + problem.getId() + ": " + found.reason());
        publishFacts(found.incident(), "Grouped under problem record #" + problem.getId() + " with "
                + incident.getCode());
        log.info("{} grouped under problem record {} ({})", incident.getCode(), problem.getId(), found.reason());
        return Optional.of(problem.getId());
    }

    private record Anchor(Incident incident, String reason) {
    }

    private Optional<Anchor> byText(Incident incident, List<Long> similarIds) {
        for (Long id : similarIds) {
            Optional<Incident> other = incidents.findById(id).filter(i -> i.getStatus().isEditable());
            if (other.isPresent() && !other.get().getId().equals(incident.getId())) {
                return Optional.of(new Anchor(other.get(), "similar to " + other.get().getCode()));
            }
        }
        return Optional.empty();
    }

    private Optional<Anchor> byGraph(Incident incident) {
        if (incident.getPriority() == null || incident.getPriority() == Priority.P4) {
            return Optional.empty();
        }
        ItService service = incident.getService();
        Set<Long> neighbours = new LinkedHashSet<>();
        service.getDependencies().forEach(s -> neighbours.add(s.getId()));
        services.findDependantsOf(service.getId()).forEach(s -> neighbours.add(s.getId()));
        Duration window = Duration.ofMinutes(config.current().intValue(ConfigKey.PROBLEM_CORRELATION_WINDOW_MINUTES));
        Instant since = incident.getCreatedAt().minus(window);
        List<Incident> candidates = new ArrayList<>(texts.findOpenOnServices(neighbours, ANCHOR_PRIORITIES, since));
        candidates.removeIf(c -> c.getId().equals(incident.getId()));
        return candidates.stream().findFirst().map(c -> new Anchor(c, "dependency between "
                + service.getName() + " and " + c.getService().getName() + ", open " + c.getPriority() + " "
                + c.getCode()));
    }

    /** The anchor's problem record, a new one if it has none; null if its record is already resolved. */
    private ProblemRecord problemOf(Incident anchor, Instant now) {
        if (anchor.getProblemId() != null) {
            return problems.findById(anchor.getProblemId()).filter(ProblemRecord::isOpen).orElse(null);
        }
        ProblemRecord created = problems.save(new ProblemRecord(anchor.getTitle(), anchor.getService(), now));
        anchor.joinProblem(created.getId(), now);
        return created;
    }

    private void publishFacts(Incident incident, String text) {
        for (IncidentFact fact : incident.drainFacts()) {
            publisher.publish(incident, fact, null, text);
        }
    }
}
