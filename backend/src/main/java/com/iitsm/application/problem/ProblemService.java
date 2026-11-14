package com.iitsm.application.problem;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.incident.IncidentEventPublisher;
import com.iitsm.application.incident.IncidentViewMapper;
import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.application.notification.NotificationRequest;
import com.iitsm.application.problem.ProblemViews.CauseView;
import com.iitsm.application.problem.ProblemViews.KnownOutageView;
import com.iitsm.application.problem.ProblemViews.ProblemView;
import com.iitsm.application.problem.ProblemViews.RootCauseView;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.InvalidStateTransitionException;
import com.iitsm.domain.exception.ResourceNotFoundException;
import com.iitsm.domain.exception.ServiceNotFoundException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.incident.ClosureReason;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.Resolution;
import com.iitsm.domain.notification.Audience;
import com.iitsm.domain.notification.NotificationEventType;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.problem.ProblemRecord;
import com.iitsm.domain.problem.ProblemStatus;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.repository.ProblemRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.service.ServiceGraph;
import com.iitsm.domain.user.User;

/**
 * Problem records (module M12, decisions DEC-71 to DEC-74): reading them, the lifecycle (the lead resolving resolves
 * the rest, an administrator resolves or ungroups), the known outages an employee may join, the root cause from the
 * service graph, and creating a record by hand from the recurring-problem proposals.
 */
@Service
public class ProblemService {

    private final ProblemRepository problems;
    private final IncidentRepository incidents;
    private final ItServiceRepository services;
    private final UserRepository users;
    private final IncidentViewMapper views;
    private final IncidentEventPublisher publisher;
    private final JoinerNotifier joinerNotifier;
    private final Clock clock;

    public ProblemService(ProblemRepository problems, IncidentRepository incidents, ItServiceRepository services,
                          UserRepository users, IncidentViewMapper views, IncidentEventPublisher publisher,
                          JoinerNotifier joinerNotifier, Clock clock) {
        this.problems = problems;
        this.incidents = incidents;
        this.services = services;
        this.users = users;
        this.views = views;
        this.publisher = publisher;
        this.joinerNotifier = joinerNotifier;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ read

    @Transactional(readOnly = true)
    public List<ProblemView> list(ProblemStatus status) {
        IncidentViewMapper.SummaryBuilder builder = views.summaries();
        return problems.findAllByStatusOrdered(status).stream().map(p -> view(p, builder)).toList();
    }

    @Transactional(readOnly = true)
    public ProblemView get(Long id) {
        return view(load(id), views.summaries());
    }

    private ProblemView view(ProblemRecord record, IncidentViewMapper.SummaryBuilder builder) {
        List<Incident> linked = incidents.findByProblemIdOrderByCreatedAtAsc(record.getId());
        List<IncidentSummary> summaries = linked.stream().map(builder::summary).toList();
        IncidentSummary lead = lead(linked).map(builder::summary).orElse(null);
        int joined = (int) linked.stream().filter(ProblemService::isJoiner).count();
        return new ProblemView(record.getId(), record.getTitle(),
                new Ref(record.getService().getId(), record.getService().getName()), record.getStatus(),
                record.getCreatedAt(), lead, summaries.size(), joined, summaries);
    }

    /**
     * The lead of a group: the highest priority, and among equals the earliest created (decision DEC-46, G5).
     * Incidents that only joined a known outage never lead.
     */
    public static Optional<Incident> lead(List<Incident> linked) {
        return linked.stream().filter(i -> !isJoiner(i)).min(Comparator
                .comparing((Incident i) -> i.getPriority() == null ? Priority.P4 : i.getPriority())
                .thenComparing(Incident::getCreatedAt));
    }

    /** An incident that exists only because someone joined a known outage: closed as a duplicate of the lead. */
    static boolean isJoiner(Incident incident) {
        return incident.getClosureReason() == ClosureReason.DUPLICATE && incident.getDuplicateOf() != null
                && incident.getProblemId() != null;
    }

    ProblemRecord load(Long id) {
        return problems.findById(id).orElseThrow(() -> new ResourceNotFoundException("Problem", id));
    }

    // ------------------------------------------------------------------ known outages (employees)

    /**
     * Open outages on the service or on any service it depends on, for the report form's "known outage" banner. An
     * employee sees the outage itself, never other people's incidents.
     */
    @Transactional(readOnly = true)
    public List<KnownOutageView> knownOutages(AuthenticatedUser caller, Long serviceId) {
        ItService service = services.findById(serviceId).orElseThrow(() -> new ServiceNotFoundException(serviceId));
        ServiceGraph graph = ServiceGraph.fromServices(services.findByActiveTrueOrderByNameAsc());
        Set<Long> watched = new LinkedHashSet<>();
        watched.add(service.getId());
        if (graph.contains(service.getId())) {
            graph.upstreamOf(service.getId()).forEach(reach -> watched.add(reach.serviceId()));
        }
        List<KnownOutageView> result = new ArrayList<>();
        for (ProblemRecord problem : problems.findOpenOnServices(watched)) {
            List<Incident> linked = incidents.findByProblemIdOrderByCreatedAtAsc(problem.getId());
            Optional<Incident> lead = lead(linked).filter(i -> i.getStatus().isEditable());
            if (lead.isEmpty()) {
                continue;
            }
            boolean joined = linked.stream().anyMatch(i -> i.isReportedBy(caller.id()));
            result.add(new KnownOutageView(problem.getId(), problem.getTitle(),
                    new Ref(problem.getService().getId(), problem.getService().getName()), lead.get().getCode(),
                    lead.get().getPriority(), lead.get().getAffectedUsers(), problem.getCreatedAt(), joined));
        }
        return result;
    }

    // ------------------------------------------------------------------ lifecycle

    /**
     * Called inside the transaction that resolved {@code incidentId}: if it is the lead of an open problem record,
     * every other open linked incident is resolved with the same fix, the record becomes RESOLVED, and the people
     * who joined the outage get one notice after the commit (decision DEC-72). A resolved incident that is not the
     * lead changes nothing for the others.
     */
    @Transactional
    public void cascadeAfterResolve(Long incidentId, Long actorId) {
        Incident resolved = incidents.findById(incidentId).orElseThrow();
        if (resolved.getProblemId() == null || resolved.getResolution() == null) {
            return;
        }
        ProblemRecord problem = problems.findById(resolved.getProblemId()).filter(ProblemRecord::isOpen).orElse(null);
        if (problem == null) {
            return;
        }
        List<Incident> linked = incidents.findByProblemIdOrderByCreatedAtAsc(problem.getId());
        List<Incident> candidates = linked.stream().filter(i -> !isJoiner(i)
                && !i.getId().equals(resolved.getId()) && i.getStatus().isEditable()).toList();
        boolean leadResolved = lead(linked.stream().filter(i -> i.getId().equals(resolved.getId())
                || i.getStatus().isEditable()).toList()).map(i -> i.getId().equals(resolved.getId())).orElse(false);
        if (!leadResolved) {
            return;
        }
        User actor = actorId == null ? null : users.findById(actorId).orElseThrow(() -> new UserNotFoundException(actorId));
        Resolution fix = resolved.getResolution();
        resolveAll(candidates, fix, resolved.getCode(), actor);
        problem.resolve();
        notifyJoiners(linked, resolved);
    }

    /**
     * POST /problems/{id}/resolve (administrator): the same fix for every open incident of the record, the lead
     * included, for the case where nobody resolved the lead itself.
     */
    @Transactional
    public ProblemView resolve(AuthenticatedUser caller, Long id, String rootCause, String notes, String steps,
                               int timeSpentMinutes) {
        ProblemRecord problem = load(id);
        if (!problem.isOpen()) {
            throw new InvalidStateTransitionException(problem.getStatus().name(), "RESOLVE_PROBLEM",
                    "the problem record is already resolved");
        }
        List<Incident> linked = incidents.findByProblemIdOrderByCreatedAtAsc(id);
        List<Incident> open = linked.stream().filter(i -> !isJoiner(i) && i.getStatus().isEditable()).toList();
        User actor = users.findById(caller.id()).orElseThrow(() -> new UserNotFoundException(caller.id()));
        Resolution fix = new Resolution(rootCause, notes, steps, timeSpentMinutes, false);
        Incident lead = lead(open).orElse(null);
        resolveAll(open, fix, lead == null ? "problem #" + id : lead.getCode(), actor);
        problem.resolve();
        notifyJoiners(linked, lead != null ? lead : linked.get(0));
        return view(problem, views.summaries());
    }

    private void resolveAll(List<Incident> targets, Resolution fix, String viaCode, User actor) {
        Instant now = clock.instant();
        for (Incident target : targets) {
            String notes = fix.getNotes() + " (Resolved together with " + viaCode + ".)";
            Resolution copy = new Resolution(fix.getRootCause(),
                    notes.length() > 4000 ? notes.substring(0, 4000) : notes, fix.getSteps(),
                    fix.getTimeSpentMinutes() == null || fix.getTimeSpentMinutes() < 1 ? 1 : fix.getTimeSpentMinutes(),
                    false);
            target.resolveWithProblem(copy, now);
            publisher.publishFact(target, actor, "Resolved together with " + viaCode
                    + ", the lead of problem record #" + target.getProblemId());
        }
    }

    private void notifyJoiners(List<Incident> linked, Incident lead) {
        List<NotificationRequest> requests = new ArrayList<>();
        for (Incident joiner : linked) {
            if (!isJoiner(joiner)) {
                continue;
            }
            User person = joiner.getReporter();
            requests.add(new NotificationRequest(
                    new NotificationRequest.Person(person.getId(), person.getName(), person.getEmail()),
                    Audience.REPORTER, NotificationEventType.INCIDENT_RESOLVED, false, lead.getPriority(),
                    joiner.getId(), joiner.getCode(),
                    Map.of("code", joiner.getCode(), "title", "Known outage resolved: " + lead.getTitle(),
                            "priority", lead.getPriority() == null ? "" : lead.getPriority().name(),
                            "service", lead.getService().getName(), "status", "RESOLVED")));
        }
        if (requests.isEmpty()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                joinerNotifier.notifyResolved(requests);
            }
        });
    }

    /** DELETE /problems/{id}/incidents/{incidentId} (administrator): takes one incident out of the record. */
    @Transactional
    public ProblemView ungroup(AuthenticatedUser caller, Long id, Long incidentId) {
        ProblemRecord problem = load(id);
        Incident incident = incidents.findById(incidentId)
                .filter(i -> id.equals(i.getProblemId()))
                .orElseThrow(() -> new ResourceNotFoundException("Incident " + incidentId + " in problem", id));
        User actor = users.findById(caller.id()).orElseThrow(() -> new UserNotFoundException(caller.id()));
        incident.leaveProblem(clock.instant());
        publisher.publishFact(incident, actor, "Taken out of problem record #" + id + " by " + actor.getName());
        return view(problem, views.summaries());
    }

    /**
     * POST /problems (team lead, administrator): a record opened by hand, usually from a recurring-problem proposal
     * (E2). The incidents must be open or resolved, not grouped yet, on at least one incident; the lead gives the
     * default title and the service.
     */
    @Transactional
    public ProblemView create(AuthenticatedUser caller, String title, Collection<Long> incidentIds) {
        List<Incident> chosen = new ArrayList<>();
        for (Long incidentId : new LinkedHashSet<>(incidentIds)) {
            Incident incident = incidents.findById(incidentId)
                    .orElseThrow(() -> new InputValidationException("incidentIds", "unknown incident " + incidentId));
            if (incident.getProblemId() != null) {
                throw new InputValidationException("incidentIds",
                        incident.getCode() + " already belongs to problem record #" + incident.getProblemId());
            }
            chosen.add(incident);
        }
        if (chosen.isEmpty()) {
            throw new InputValidationException("incidentIds", "at least one incident is required");
        }
        Incident lead = lead(chosen).orElse(chosen.get(0));
        Instant now = clock.instant();
        ProblemRecord problem = problems.save(new ProblemRecord(
                title == null || title.isBlank() ? lead.getTitle() : title, lead.getService(), now));
        User actor = users.findById(caller.id()).orElseThrow(() -> new UserNotFoundException(caller.id()));
        for (Incident incident : chosen) {
            incident.joinProblem(problem.getId(), now);
            publisher.publishFact(incident, actor,
                    "Grouped under problem record #" + problem.getId() + " by " + actor.getName());
        }
        return view(problem, views.summaries());
    }

    // ------------------------------------------------------------------ root cause from the service graph

    /**
     * The common upstream service of every affected service is the probable root cause (DEC-73): for each affected
     * service collect everything it depends on, keep the services in every set (an affected service counts as its own
     * upstream), and rank them by the farthest and then the total distance, closest first. The dependency paths
     * from each affected service are the evidence.
     */
    @Transactional(readOnly = true)
    public RootCauseView rootCause(Long id) {
        ProblemRecord problem = load(id);
        List<Incident> linked = incidents.findByProblemIdOrderByCreatedAtAsc(id);
        Map<Long, ItService> byId = new LinkedHashMap<>();
        services.findAllByOrderByNameAsc().forEach(s -> byId.put(s.getId(), s));
        Set<Long> affected = new LinkedHashSet<>();
        linked.forEach(i -> affected.add(i.getService().getId()));
        ServiceGraph graph = ServiceGraph.fromServices(services.findByActiveTrueOrderByNameAsc());
        List<ServiceGraph.CommonUpstream> common = graph.commonUpstream(affected);
        List<CauseView> candidates = new ArrayList<>();
        for (ServiceGraph.CommonUpstream candidate : common) {
            List<List<Ref>> paths = new ArrayList<>();
            for (Long from : affected) {
                paths.add(pathBetween(byId, from, candidate.serviceId()));
            }
            ItService cause = byId.get(candidate.serviceId());
            candidates.add(new CauseView(new Ref(cause.getId(), cause.getName()), candidate.maxDistance(),
                    candidate.totalDistance(), affected.contains(cause.getId()), paths));
        }
        CauseView probable = candidates.isEmpty() ? null : candidates.get(0);
        List<Ref> affectedRefs = affected.stream().map(sid -> new Ref(sid, byId.get(sid).getName())).toList();
        String explanation;
        if (probable == null) {
            explanation = "The affected services share no upstream service, so the graph names no common cause.";
        } else if (probable.affected() && affected.size() == 1) {
            explanation = "Every incident is on " + probable.service().name()
                    + " itself; its own upstream services are the next candidates.";
        } else {
            explanation = probable.service().name() + " is the closest service that every affected service depends on"
                    + " (" + probable.maxDistance() + " step(s) at most).";
        }
        return new RootCauseView(problem.getId(), affectedRefs, probable, candidates, explanation);
    }

    /** Shortest chain of dependencies from {@code from} to {@code to} (both included); a single node if equal. */
    private static List<Ref> pathBetween(Map<Long, ItService> byId, Long from, Long to) {
        Map<Long, Long> parent = new HashMap<>();
        Deque<Long> queue = new ArrayDeque<>();
        queue.add(from);
        parent.put(from, null);
        while (!queue.isEmpty()) {
            Long current = queue.poll();
            if (current.equals(to)) {
                break;
            }
            for (ItService dependency : byId.get(current).getDependencies()) {
                if (byId.containsKey(dependency.getId()) && !parent.containsKey(dependency.getId())) {
                    parent.put(dependency.getId(), current);
                    queue.add(dependency.getId());
                }
            }
        }
        LinkedHashMap<Long, Ref> reversed = new LinkedHashMap<>();
        for (Long node = parent.containsKey(to) ? to : null; node != null; node = parent.get(node)) {
            reversed.put(node, new Ref(node, byId.get(node).getName()));
        }
        List<Ref> path = new ArrayList<>(reversed.values());
        java.util.Collections.reverse(path);
        return path;
    }
}
