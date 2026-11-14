package com.iitsm.application.problem;

import java.time.Clock;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.incident.IncidentEventPublisher;
import com.iitsm.application.incident.IncidentViewMapper;
import com.iitsm.application.incident.IncidentViews.IncidentDetail;
import com.iitsm.application.incident.PriorityRecalculator;
import com.iitsm.domain.exception.InvalidStateTransitionException;
import com.iitsm.domain.exception.ResourceNotFoundException;
import com.iitsm.domain.exception.UserNotFoundException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentFact;
import com.iitsm.domain.incident.IncidentFactory;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.problem.ProblemRecord;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.ProblemRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.User;

/**
 * Join a known outage with one click (Major Incident Mode, DEC-73). An employee who sees "known outage, being worked
 * on" on the report form does not fill a second form:
 * <ul>
 *   <li>a small incident is made for them: same service, category, impact and urgency as the lead, one user,
 *       linked to the problem record and to the lead, and closed at once as a duplicate of it, so it needs no
 *       triage, no SLA clock and no escalation;</li>
 *   <li>the lead's affected users go up by one and its priority is calculated again, so the priority climbs by itself
 *       as reports pile up (the handbook's own multiplier at 10 and 101 users);</li>
 *   <li>when the lead is resolved the joiner gets one notice (see {@link ProblemService#cascadeAfterResolve}).</li>
 * </ul>
 * Joining twice returns the first joiner incident; someone who already reported an incident of this outage is
 * pointed to it and no second one is made.
 */
@Service
public class KnownOutageService {

    private final ProblemRepository problems;
    private final IncidentRepository incidents;
    private final UserRepository users;
    private final IncidentFactory factory;
    private final PriorityRecalculator priorities;
    private final IncidentEventPublisher publisher;
    private final IncidentViewMapper views;
    private final Clock clock;

    public KnownOutageService(ProblemRepository problems, IncidentRepository incidents, UserRepository users,
                              IncidentFactory factory, PriorityRecalculator priorities,
                              IncidentEventPublisher publisher, IncidentViewMapper views, Clock clock) {
        this.problems = problems;
        this.incidents = incidents;
        this.users = users;
        this.factory = factory;
        this.priorities = priorities;
        this.publisher = publisher;
        this.views = views;
        this.clock = clock;
    }

    @Transactional
    public IncidentDetail join(AuthenticatedUser caller, Long problemId) {
        ProblemRecord problem = problems.findById(problemId)
                .orElseThrow(() -> new ResourceNotFoundException("Problem", problemId));
        List<Incident> linked = incidents.findByProblemIdOrderByCreatedAtAsc(problemId);
        for (Incident own : linked) {
            if (own.isReportedBy(caller.id())) {
                return views.detail(own, caller);
            }
        }
        Incident lead = ProblemService.lead(linked).filter(i -> i.getStatus().isEditable()).orElse(null);
        if (!problem.isOpen() || lead == null) {
            throw new InvalidStateTransitionException(problem.getStatus().name(), "JOIN_OUTAGE",
                    "this outage is already resolved");
        }
        User reporter = users.findById(caller.id()).orElseThrow(() -> new UserNotFoundException(caller.id()));
        var now = clock.instant();

        Incident joiner = factory.create(reporter, lead.getService(), lead.getCategory(),
                "Known outage: " + lead.getTitle(),
                "Joined the known outage " + lead.getCode() + " (" + lead.getTitle() + "): the same problem, "
                        + "reported with one click.",
                lead.getImpact(), lead.getUrgency(), 1);
        priorities.recalculate(joiner);
        joiner.joinProblem(problem.getId(), now);
        joiner.markDuplicate(lead, now);
        joiner = incidents.save(joiner);
        for (IncidentFact fact : joiner.drainFacts()) {
            String text = switch (fact.action()) {
                case INCIDENT_CREATED -> "Joined the known outage " + lead.getCode() + " by " + reporter.getName();
                case CLASSIFIED -> "Classified like " + lead.getCode();
                case DUPLICATE_LINKED -> fact.after() == fact.before()
                        ? "Grouped under problem record #" + problem.getId()
                        : "Closed as a duplicate of " + lead.getCode() + " (known outage joined)";
                default -> "Priority calculated like the lead incident";
            };
            publisher.publish(joiner, fact, fact.action().name().startsWith("PRIORITY") ? null : reporter, text);
        }

        Priority before = lead.getPriority();
        int usersBefore = lead.getAffectedUsers();
        lead.updateDetails(null, null, null, usersBefore + 1, now);
        priorities.recalculate(lead);
        String change = before == lead.getPriority() ? "priority stays " + before
                : "priority " + before + " → " + lead.getPriority();
        for (IncidentFact fact : lead.drainFacts()) {
            publisher.publish(lead, fact, null, "Known outage joined by " + reporter.getName() + " (affected users "
                    + usersBefore + " → " + lead.getAffectedUsers() + "; " + change + ")");
        }
        return views.detail(joiner, caller);
    }
}
