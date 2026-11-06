package com.iitsm.application.incident;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentViews.CommentView;
import com.iitsm.application.incident.IncidentViews.IncidentDetail;
import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.domain.assignment.EligibilityFilter;
import com.iitsm.domain.assignment.WorkloadTracker;
import com.iitsm.domain.category.Category;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.exception.IncidentNotFoundException;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.OptimisticLockConflictException;
import com.iitsm.domain.exception.ServiceNotFoundException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.incident.ClosureReason;
import com.iitsm.domain.incident.CommentVisibility;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;
import com.iitsm.domain.incident.IncidentComment;
import com.iitsm.domain.incident.IncidentFactory;
import com.iitsm.domain.incident.IncidentQuery;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.incident.Resolution;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.priority.PriorityBreakdown;
import com.iitsm.domain.priority.PriorityEngine;
import com.iitsm.domain.priority.PriorityInput;
import com.iitsm.domain.repository.CategoryRepository;
import com.iitsm.domain.repository.IncidentCommentRepository;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.IncidentSearch;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.repository.PageSlice;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.sla.SlaPolicy;
import com.iitsm.domain.sla.SlaPolicyResolver;
import com.iitsm.domain.user.PermissionKey;
import com.iitsm.domain.user.User;

/**
 * Incident use cases (module M4 with the M5 priority engine). Every action follows the same steps: load, check that
 * the caller may do it (403 UNAUTHORIZED_OPERATION), let the State pattern decide whether the move is legal in the
 * current status (409 INVALID_STATE_TRANSITION), save, return the detail view. One transaction per call, so a
 * failed step changes nothing.
 * <p>
 * Still to come from later modules: duplicate detection and AI category suggestion (M12), automatic assignment
 * (M6; until then new incidents wait in CLASSIFIED for manual assignment), domain events and audit (M8).
 */
@Service
public class IncidentService {

    private final IncidentRepository incidents;
    private final IncidentSearch search;
    private final IncidentCommentRepository comments;
    private final ItServiceRepository services;
    private final CategoryRepository categories;
    private final UserRepository users;
    private final IncidentFactory factory;
    private final PriorityEngine priorityEngine;
    private final SlaPolicyResolver slaPolicies;
    private final ConfigService config;
    private final IncidentAccessPolicy access;
    private final IncidentViewMapper views;
    private final Clock clock;

    public IncidentService(IncidentRepository incidents, IncidentSearch search, IncidentCommentRepository comments,
                           ItServiceRepository services, CategoryRepository categories, UserRepository users,
                           IncidentFactory factory, PriorityEngine priorityEngine, SlaPolicyResolver slaPolicies,
                           ConfigService config, IncidentAccessPolicy access, IncidentViewMapper views, Clock clock) {
        this.incidents = incidents;
        this.search = search;
        this.comments = comments;
        this.services = services;
        this.categories = categories;
        this.users = users;
        this.factory = factory;
        this.priorityEngine = priorityEngine;
        this.slaPolicies = slaPolicies;
        this.config = config;
        this.access = access;
        this.views = views;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ create

    /**
     * Creation pipeline (handbook 2.5 M4): validate, create NEW, classify (given category or triage), calculate the
     * priority, resolve the SLA policy and set the deadlines. A missing SLA policy fails the whole creation with
     * 422 SLA_NOT_CONFIGURED naming the service and priority.
     */
    @Transactional
    public IncidentDetail create(AuthenticatedUser caller, String title, String description, Long serviceId,
                                 Long categoryId, int impact, int urgency, int affectedUsers) {
        User reporter = loadUser(caller.id());
        ItService service = services.findById(serviceId).orElseThrow(() -> new ServiceNotFoundException(serviceId));
        Category category = categoryId == null ? null : categories.findById(categoryId)
                .orElseThrow(() -> new InputValidationException("categoryId", "unknown category " + categoryId));

        Incident incident = factory.create(reporter, service, category, title, description, impact, urgency,
                affectedUsers);
        recalculatePriority(incident);
        incident = incidents.save(incident);
        return views.detail(incident, caller);
    }

    // ------------------------------------------------------------------ read

    @Transactional(readOnly = true)
    public PageSlice<IncidentSummary> list(AuthenticatedUser caller, IncidentQuery requested) {
        IncidentQuery query = access.seesAll(caller) ? requested : withVisibility(requested, caller.id());
        IncidentViewMapper.SummaryBuilder builder = views.summaries();
        return search.search(query).map(builder::summary);
    }

    @Transactional(readOnly = true)
    public IncidentDetail detail(AuthenticatedUser caller, Long id) {
        return views.detail(loadVisible(caller, id), caller);
    }

    @Transactional(readOnly = true)
    public List<CommentView> comments(AuthenticatedUser caller, Long id) {
        Incident incident = loadVisible(caller, id);
        // INTERNAL notes are hidden from the reporter (handbook A.3), unless the reporter is a lead or admin
        boolean seesInternal = !incident.isReportedBy(caller.id()) || access.seesAll(caller);
        return comments.findByIncident_IdOrderByCreatedAtAsc(incident.getId()).stream()
                .filter(c -> seesInternal || c.getVisibility() == CommentVisibility.PUBLIC)
                .map(views::comment)
                .toList();
    }

    // ------------------------------------------------------------------ edit

    /**
     * PUT /incidents/{id}: description, impact, urgency, affected users. The priority and the SLA deadlines are
     * recalculated. If the client sends the version it last saw and someone changed the incident meanwhile, the
     * update is refused with OPTIMISTIC_LOCK_CONFLICT; two truly simultaneous updates are caught by the version
     * column at commit.
     */
    @Transactional
    public IncidentDetail update(AuthenticatedUser caller, Long id, String description, Integer impact,
                                 Integer urgency, Integer affectedUsers, Long expectedVersion) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.EDIT);
        if (expectedVersion != null && expectedVersion != incident.getVersion()) {
            throw new OptimisticLockConflictException();
        }
        incident.updateDetails(description, impact, urgency, affectedUsers, clock.instant());
        recalculatePriority(incident);
        return views.detail(incident, caller);
    }

    /** Admin or team lead sets the priority by hand; the reason is recorded in the breakdown and as a note. */
    @Transactional
    public IncidentDetail overridePriority(AuthenticatedUser caller, Long id, Priority priority, String reason) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.OVERRIDE_PRIORITY);
        requireReason(reason);
        User actor = loadUser(caller.id());
        PriorityBreakdown manual = incident.getPriorityBreakdown()
                .withBand(priority, "Manually set to " + priority + " by " + actor.getName() + ": " + reason.strip());
        SlaPolicy policy = slaPolicies.resolve(incident.getService(), priority);
        Instant now = clock.instant();
        incident.applyPriority(manual, policy.responseTarget(), policy.resolutionTarget(), now);
        addNote(incident, actor, CommentVisibility.INTERNAL, "Priority set to " + priority + ": " + reason, now);
        return views.detail(incident, caller);
    }

    // ------------------------------------------------------------------ assignment

    /** Manual assignment by an admin or team lead. Automatic assignment by strategy arrives with M6. */
    @Transactional
    public IncidentDetail assign(AuthenticatedUser caller, Long id, Long technicianId) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.ASSIGN);
        if (technicianId == null) {
            throw new InputValidationException("technicianId",
                    "is required until automatic assignment (module M6) is available");
        }
        User technician = loadEligibleTechnician(technicianId, incident);
        Instant now = clock.instant();
        incident.assign(technician, now);
        technician.technicianRole().ifPresent(role -> role.getProfile().markAssigned(now));
        return views.detail(incident, caller);
    }

    @Transactional
    public IncidentDetail reassign(AuthenticatedUser caller, Long id, Long technicianId, String reason) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.REASSIGN);
        requireReason(reason);
        User technician = loadEligibleTechnician(technicianId, incident);
        Instant now = clock.instant();
        incident.reassign(technician, now);
        technician.technicianRole().ifPresent(role -> role.getProfile().markAssigned(now));
        addNote(incident, loadUser(caller.id()), CommentVisibility.INTERNAL,
                "Reassigned to " + technician.getName() + ": " + reason, now);
        return views.detail(incident, caller);
    }

    // ------------------------------------------------------------------ lifecycle

    @Transactional
    public IncidentDetail acknowledge(AuthenticatedUser caller, Long id) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.ACKNOWLEDGE);
        incident.acknowledge(clock.instant());
        return views.detail(incident, caller);
    }

    @Transactional
    public IncidentDetail startWork(AuthenticatedUser caller, Long id) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.START_WORK);
        incident.startWork(clock.instant());
        return views.detail(incident, caller);
    }

    /** The question is saved as a public note so the reporter sees it. */
    @Transactional
    public IncidentDetail requestInfo(AuthenticatedUser caller, Long id, String message) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.REQUEST_INFO);
        Instant now = clock.instant();
        incident.requestInfo(message, now);
        addNote(incident, loadUser(caller.id()), CommentVisibility.PUBLIC, message, now);
        return views.detail(incident, caller);
    }

    @Transactional
    public IncidentDetail provideInfo(AuthenticatedUser caller, Long id, String message) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.PROVIDE_INFO);
        Instant now = clock.instant();
        incident.provideInfo(message, now);
        addNote(incident, loadUser(caller.id()), CommentVisibility.PUBLIC, message, now);
        return views.detail(incident, caller);
    }

    @Transactional
    public IncidentDetail resolve(AuthenticatedUser caller, Long id, String rootCause, String notes, String steps,
                                  Integer timeSpentMinutes, boolean reusableSolution) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.RESOLVE);
        Resolution resolution = new Resolution(rootCause, notes, steps,
                timeSpentMinutes == null ? 0 : timeSpentMinutes, reusableSolution);
        incident.resolve(resolution, clock.instant());
        return views.detail(incident, caller);
    }

    @Transactional
    public IncidentDetail verify(AuthenticatedUser caller, Long id) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.VERIFY);
        incident.verify(clock.instant());
        return views.detail(incident, caller);
    }

    @Transactional
    public IncidentDetail close(AuthenticatedUser caller, Long id) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.CLOSE);
        incident.close(ClosureReason.VERIFIED, clock.instant());
        return views.detail(incident, caller);
    }

    /** Restarts the resolution clock with the full target of the incident's SLA; the reason is a public note. */
    @Transactional
    public IncidentDetail reopen(AuthenticatedUser caller, Long id, String reason) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.REOPEN);
        AppSettings settings = config.current();
        SlaPolicy policy = slaPolicies.resolve(incident.getService(), incident.getPriority());
        Instant now = clock.instant();
        incident.reopen(reason, now, settings.reopenWindow(), policy.resolutionTarget());
        addNote(incident, loadUser(caller.id()), CommentVisibility.PUBLIC, "Reopened: " + reason, now);
        return views.detail(incident, caller);
    }

    // ------------------------------------------------------------------ comments

    /** INTERNAL notes are for technicians and admins only. */
    @Transactional
    public CommentView addComment(AuthenticatedUser caller, Long id, String body, CommentVisibility visibility) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.COMMENT);
        CommentVisibility chosen = visibility == null ? CommentVisibility.PUBLIC : visibility;
        if (chosen == CommentVisibility.INTERNAL
                && !(caller.can(PermissionKey.INCIDENT_HANDLE) || access.seesAll(caller))) {
            throw new InputValidationException("visibility", "INTERNAL notes are for technicians and admins");
        }
        IncidentComment saved = comments.save(
                new IncidentComment(incident, loadUser(caller.id()), chosen, body, clock.instant()));
        return views.comment(saved);
    }

    // ------------------------------------------------------------------ helpers

    /**
     * Runs the priority engine with the live settings and applies the result together with the SLA targets of the
     * resolved policy (service policy, else global default, else SLA_NOT_CONFIGURED).
     */
    private void recalculatePriority(Incident incident) {
        ItService service = incident.getService();
        PriorityInput input = new PriorityInput(incident.getImpact(), incident.getUrgency(),
                service.getCriticality(), incident.getAffectedUsers(), service.getName(), service.isAlwaysP1(),
                isSecurity(incident.getCategory()));
        PriorityBreakdown breakdown = priorityEngine.calculate(input, config.current());
        SlaPolicy policy = slaPolicies.resolve(service, breakdown.band());
        incident.applyPriority(breakdown, policy.responseTarget(), policy.resolutionTarget(), clock.instant());
    }

    /** The category is Security or sits under it (for example Phishing). Categories are admin data, not code. */
    private static boolean isSecurity(Category category) {
        for (Category c = category; c != null; c = c.getParent()) {
            if (c.getName().toLowerCase(Locale.ROOT).equals("security")) {
                return true;
            }
        }
        return false;
    }

    private User loadEligibleTechnician(Long technicianId, Incident incident) {
        if (technicianId == null) {
            throw new InputValidationException("technicianId", "is required");
        }
        User technician = loadUser(technicianId);
        int load = WorkloadTracker.loadOf(
                incidents.findByAssignee_IdAndStatusIn(technicianId, IncidentStatus.ACTIVE_WORK));
        EligibilityFilter.requireEligible(technician, incident, load);
        return technician;
    }

    private void addNote(Incident incident, User author, CommentVisibility visibility, String text, Instant now) {
        String body = text.length() > IncidentComment.MAX_LENGTH ? text.substring(0, IncidentComment.MAX_LENGTH) : text;
        comments.save(new IncidentComment(incident, author, visibility, body, now));
    }

    private static void requireReason(String reason) {
        int length = reason == null ? 0 : reason.strip().length();
        if (length < 10 || length > 1000) {
            throw new InputValidationException("reason", "must be between 10 and 1000 characters");
        }
    }

    private Incident load(Long id) {
        return incidents.findById(id).orElseThrow(() -> new IncidentNotFoundException(id));
    }

    /** Read endpoints hide incidents the caller may not see (404, so their existence is not revealed). */
    private Incident loadVisible(AuthenticatedUser caller, Long id) {
        Incident incident = load(id);
        if (!access.canView(caller, incident)) {
            throw new IncidentNotFoundException(id);
        }
        return incident;
    }

    private User loadUser(Long userId) {
        return users.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
    }

    private static IncidentQuery withVisibility(IncidentQuery q, Long userId) {
        return new IncidentQuery(userId, q.statuses(), q.priorities(), q.categoryId(), q.serviceId(),
                q.assigneeId(), q.reporterId(), q.code(), q.text(), q.createdFrom(), q.createdTo(), q.page(),
                q.size(), q.sortField(), q.ascending());
    }
}
