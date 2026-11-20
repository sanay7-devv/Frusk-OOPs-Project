package com.iitsm.application.incident;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.assignment.AssignmentService;
import com.iitsm.application.audit.AuditService.AuditEntryView;
import com.iitsm.application.assignment.AssignmentService.RecommendationView;
import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentViews.CommentView;
import com.iitsm.application.incident.IncidentViews.IncidentDetail;
import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.application.incident.command.AcknowledgeCommand;
import com.iitsm.application.incident.command.CloseCommand;
import com.iitsm.application.incident.command.IncidentCommandRunner;
import com.iitsm.application.incident.command.ProvideInfoCommand;
import com.iitsm.application.incident.command.ReopenCommand;
import com.iitsm.application.incident.command.RequestInfoCommand;
import com.iitsm.application.incident.command.ResolveCommand;
import com.iitsm.application.incident.command.StartWorkCommand;
import com.iitsm.application.incident.command.VerifyCommand;
import com.iitsm.application.incident.command.WithdrawCommand;
import com.iitsm.application.problem.ProblemService;
import com.iitsm.domain.assignment.EligibilityFilter;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.audit.AuditText;
import com.iitsm.domain.event.TriageNeeded;
import com.iitsm.domain.repository.AuditRepository;
import com.iitsm.domain.assignment.WorkloadTracker;
import com.iitsm.domain.category.Category;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.IncidentNotFoundException;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.exception.OptimisticLockConflictException;
import com.iitsm.domain.exception.ServiceNotFoundException;
import com.iitsm.domain.exception.TechnicianUnavailableException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.incident.CommentVisibility;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentAction;
import com.iitsm.domain.incident.IncidentComment;
import com.iitsm.domain.incident.IncidentFact;
import com.iitsm.domain.incident.IncidentFactory;
import com.iitsm.domain.incident.IncidentQuery;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.priority.PriorityBreakdown;
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
 * failed step changes nothing. The plain lifecycle actions are command objects run by {@link IncidentCommandRunner}
 * (Command pattern, decision DEC-46); creation, edits, assignment, priority override and comments stay here.
 * <p>
 * Every successful action publishes an {@link IncidentChanged} event (Observer, module M8); the audit listener
 * writes it in the same transaction, so an action never commits without its audit record and a refused one leaves
 * none. Still to come: duplicate detection and AI category suggestion (M12).
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
    private final PriorityRecalculator priorities;
    private final SlaPolicyResolver slaPolicies;
    private final ConfigService config;
    private final IncidentAccessPolicy access;
    private final IncidentViewMapper views;
    private final AssignmentService assignment;
    private final AuditRepository audit;
    private final ApplicationEventPublisher events;
    private final IncidentEventPublisher publisher;
    private final IncidentCommandRunner commands;
    private final ProblemService problems;
    private final Clock clock;

    public IncidentService(IncidentRepository incidents, IncidentSearch search, IncidentCommentRepository comments,
                           ItServiceRepository services, CategoryRepository categories, UserRepository users,
                           IncidentFactory factory, PriorityRecalculator priorities, SlaPolicyResolver slaPolicies,
                           ConfigService config, IncidentAccessPolicy access, IncidentViewMapper views,
                           AssignmentService assignment, AuditRepository audit, ApplicationEventPublisher events,
                           IncidentEventPublisher publisher, IncidentCommandRunner commands, ProblemService problems,
                           Clock clock) {
        this.incidents = incidents;
        this.search = search;
        this.comments = comments;
        this.services = services;
        this.categories = categories;
        this.users = users;
        this.factory = factory;
        this.priorities = priorities;
        this.slaPolicies = slaPolicies;
        this.config = config;
        this.access = access;
        this.views = views;
        this.assignment = assignment;
        this.audit = audit;
        this.events = events;
        this.publisher = publisher;
        this.commands = commands;
        this.problems = problems;
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
        return create(caller, title, description, serviceId, categoryId, impact, urgency, affectedUsers, null);
    }

    /**
     * @param classificationNote audit wording of the CLASSIFIED step when the category was chosen by the AI
     *                           suggestion and not by the reporter (decision DEC-70); null otherwise
     */
    @Transactional
    public IncidentDetail create(AuthenticatedUser caller, String title, String description, Long serviceId,
                                 Long categoryId, int impact, int urgency, int affectedUsers,
                                 String classificationNote) {
        User reporter = loadUser(caller.id());
        ItService service = services.findById(serviceId).orElseThrow(() -> new ServiceNotFoundException(serviceId));
        Category category = categoryId == null ? null : categories.findById(categoryId)
                .orElseThrow(() -> new InputValidationException("categoryId", "unknown category " + categoryId));

        Incident incident = factory.create(reporter, service, category, title, description, impact, urgency,
                affectedUsers);
        recalculatePriority(incident);
        assignment.autoAssign(incident); // stays CLASSIFIED (triage) without a category or an eligible technician
        incident = incidents.save(incident);
        publishCreation(incident, reporter, classificationNote);
        return views.detail(incident, caller);
    }

    /**
     * The creation pipeline as audit steps: the incident recorded reported, classified, prioritized and (if a
     * technician was found) assigned; here each fact gets its actor and wording. Without an assignee the incident
     * goes to triage.
     */
    private void publishCreation(Incident incident, User reporter, String classificationNote) {
        Category category = incident.getCategory();
        for (IncidentFact fact : incident.drainFacts()) {
            switch (fact.action()) {
                case INCIDENT_CREATED -> publish(incident, fact, reporter,
                        "Reported by " + reporter.getName() + " on " + incident.getService().getName());
                case CLASSIFIED -> publish(incident, fact, null,
                        category == null ? "No category given: waiting in triage"
                                : classificationNote != null ? classificationNote
                                : "Classified as " + category.getName());
                case PRIORITY_CALCULATED -> publish(incident, fact, null, priorityText(incident));
                case ASSIGNED -> publish(incident, fact, null,
                        "Assigned to " + incident.getAssignee().getName() + " by the "
                                + config.current().assignmentStrategy() + " strategy");
                default -> throw new IllegalStateException(
                        "Unexpected " + fact.action() + " while creating " + incident.getCode());
            }
        }
        if (incident.getStatus() != IncidentStatus.ASSIGNED) {
            events.publishEvent(new TriageNeeded(incident.getId(), incident.getCode(), incident.getPriority(),
                    category == null ? "no category" : "no eligible technician", clock.instant()));
        }
    }

    /** GET /incidents/{id}/history: the audit trail; a reporter without staff rights does not see internal notes. */
    @Transactional(readOnly = true)
    public List<AuditEntryView> history(AuthenticatedUser caller, Long id) {
        Incident incident = loadVisible(caller, id);
        boolean seesInternal = !incident.isReportedBy(caller.id()) || access.seesAll(caller);
        return audit.findByIncident(incident.getId()).stream()
                .filter(entry -> seesInternal || !entry.isInternal())
                .map(AuditEntryView::of)
                .toList();
    }

    /** GET /incidents/{id}/recommendations: top 3 with reasons and factor scores, plus who was excluded and why. */
    @Transactional(readOnly = true)
    public RecommendationView recommendations(AuthenticatedUser caller, Long id) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.ASSIGN);
        return assignment.recommendationView(incident);
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
        // a status that forbids editing is the domain's answer (409), so the G4 check only applies while it is open
        if (incident.getStatus().isEditable() && (changes(impact, incident.getImpact()) || changes(urgency, incident.getUrgency())
                || changes(affectedUsers, incident.getAffectedUsers()))) {
            access.requirePriorityInputEdit(caller, incident);
        }
        Priority before = incident.getPriority();
        incident.updateDetails(description, impact, urgency, affectedUsers, clock.instant());
        recalculatePriority(incident);
        boolean changed = before != incident.getPriority();
        User actor = loadUser(caller.id());
        publishFact(incident, actor,
                "Details updated by " + actor.getName() + "; "
                        + (changed ? "priority " + before + " → " + incident.getPriority() + ". " : "")
                        + priorityText(incident));
        return views.detail(incident, caller);
    }

    /** A value sent that differs from the stored one (sending the same value back is not a change). */
    private static boolean changes(Integer sent, int current) {
        return sent != null && sent != current;
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
        Priority before = incident.getPriority();
        incident.overridePriority(manual, policy.targets(config.current()), now);
        addNote(incident, actor, CommentVisibility.INTERNAL, "Priority set to " + priority + ": " + reason, now);
        // the reason is in the internal note, not here: reporters see this entry
        publishFact(incident, actor,
                "Priority set by hand from " + before + " to " + priority + " by " + actor.getName());
        return views.detail(incident, caller);
    }

    // ------------------------------------------------------------------ assignment

    /**
     * Assignment by an admin or team lead: to the chosen technician (eligibility checked, with the specific error),
     * or, without technicianId, to the best one picked by the active strategy.
     */
    @Transactional
    public IncidentDetail assign(AuthenticatedUser caller, Long id, Long technicianId) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.ASSIGN);
        User technician = technicianId != null
                ? loadEligibleTechnician(technicianId, incident)
                : assignment.recommend(incident).best()
                        .map(choice -> choice.candidate().technician())
                        .orElseThrow(TechnicianUnavailableException::noneEligible);
        assignment.assign(incident, technician);
        User actor = loadUser(caller.id());
        publishFact(incident, actor,
                "Assigned to " + technician.getName() + " by " + actor.getName()
                        + (technicianId == null ? " using the " + config.current().assignmentStrategy() + " strategy"
                        : ""));
        return views.detail(incident, caller);
    }

    @Transactional
    public IncidentDetail reassign(AuthenticatedUser caller, Long id, Long technicianId, String reason) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.REASSIGN);
        requireReason(reason);
        User technician = loadEligibleTechnician(technicianId, incident);
        Instant now = clock.instant();
        String previous = incident.getAssignee() == null ? "nobody" : incident.getAssignee().getName();
        incident.reassign(technician, now);
        technician.technicianRole().ifPresent(role -> role.getProfile().markAssigned(now));
        // reassign keeps the status, so it does not go through AssignmentService.assign (which assigns from CLASSIFIED)
        User actor = loadUser(caller.id());
        addNote(incident, actor, CommentVisibility.INTERNAL, "Reassigned to " + technician.getName() + ": " + reason,
                now);
        publishFact(incident, actor,
                "Reassigned from " + previous + " to " + technician.getName() + " by " + actor.getName());
        return views.detail(incident, caller);
    }

    // ------------------------------------------------------------------ lifecycle (Command pattern)

    // Each action is a small command object; the runner does the steps they all share (see IncidentCommandRunner).

    @Transactional
    public IncidentDetail acknowledge(AuthenticatedUser caller, Long id) {
        return commands.run(caller, id, new AcknowledgeCommand());
    }

    @Transactional
    public IncidentDetail startWork(AuthenticatedUser caller, Long id) {
        return commands.run(caller, id, new StartWorkCommand());
    }

    /** The question is saved as a public note so the reporter sees it. */
    @Transactional
    public IncidentDetail requestInfo(AuthenticatedUser caller, Long id, String message) {
        return commands.run(caller, id, new RequestInfoCommand(message));
    }

    @Transactional
    public IncidentDetail provideInfo(AuthenticatedUser caller, Long id, String message) {
        return commands.run(caller, id, new ProvideInfoCommand(message));
    }

    @Transactional
    public IncidentDetail resolve(AuthenticatedUser caller, Long id, String rootCause, String notes, String steps,
                                  Integer timeSpentMinutes, boolean reusableSolution) {
        IncidentDetail resolved = commands.run(caller, id,
                new ResolveCommand(rootCause, notes, steps, timeSpentMinutes, reusableSolution));
        // the lead of a problem record resolved: the rest of the record gets the same fix (DEC-72)
        problems.cascadeAfterResolve(id, caller.id());
        return resolved;
    }

    @Transactional
    public IncidentDetail verify(AuthenticatedUser caller, Long id) {
        return commands.run(caller, id, new VerifyCommand());
    }

    @Transactional
    public IncidentDetail close(AuthenticatedUser caller, Long id) {
        return commands.run(caller, id, new CloseCommand());
    }

    /** Restarts the resolution clock with the full target of the incident's SLA; the reason is a public note. */
    @Transactional
    public IncidentDetail reopen(AuthenticatedUser caller, Long id, String reason) {
        return commands.run(caller, id, new ReopenCommand(reason));
    }

    /** The reporter takes the report back before work starts (G3); the reason is a public note. */
    @Transactional
    public IncidentDetail withdraw(AuthenticatedUser caller, Long id, String reason) {
        return commands.run(caller, id, new WithdrawCommand(reason));
    }

    /**
     * POST /incidents/{id}/mark-duplicate (admin, team lead): closes this incident as a duplicate of another one; the
     * work continues there. Audited as DUPLICATE_LINKED; the reporter gets a public note naming the original.
     */
    @Transactional
    public IncidentDetail markDuplicate(AuthenticatedUser caller, Long id, Long duplicateOfId) {
        Incident incident = load(id);
        access.require(caller, incident, IncidentAction.MARK_DUPLICATE);
        if (duplicateOfId == null) {
            throw new InputValidationException("duplicateOfId", "is required");
        }
        Incident original = incidents.findById(duplicateOfId)
                .orElseThrow(() -> new InputValidationException("duplicateOfId", "unknown incident " + duplicateOfId));
        Instant now = clock.instant();
        incident.markDuplicate(original, now);
        User actor = loadUser(caller.id());
        addNote(incident, actor, CommentVisibility.PUBLIC,
                "Closed as a duplicate of " + original.getCode() + ": the work continues there.", now);
        publishFact(incident, actor, "Marked as a duplicate of " + original.getCode() + " by " + actor.getName()
                + "; closed as DUPLICATE");
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
        // a comment is a separate record, not a change of the incident itself, so the incident has no fact for it
        User author = loadUser(caller.id());
        IncidentStatus status = incident.getStatus();
        IncidentFact fact = new IncidentFact(AuditAction.COMMENT_ADDED, status, status);
        if (chosen == CommentVisibility.INTERNAL) {
            publisher.publishInternal(incident, fact, author, "added by " + author.getName());
        } else {
            publish(incident, fact, author, "Comment added by " + author.getName());
        }
        return views.comment(saved);
    }

    // ------------------------------------------------------------------ helpers

    private void publishFact(Incident incident, User actor, String description) {
        publisher.publishFact(incident, actor, description);
    }

    private void publish(Incident incident, IncidentFact fact, User actor, String description) {
        publisher.publish(incident, fact, actor, description);
    }

    private static String priorityText(Incident incident) {
        PriorityBreakdown b = incident.getPriorityBreakdown();
        return "Priority " + b.band() + " (score " + b.score() + ")"
                + (b.overrideRule() == null ? "" : ", rule: " + b.overrideRule())
                + "; response due " + AuditText.instant(incident.getSla().getResponseDue())
                + ", resolution due " + AuditText.instant(incident.getSla().getResolutionDue());
    }

    private void recalculatePriority(Incident incident) {
        priorities.recalculate(incident);
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
        return q.visibleTo(userId);
    }
}
