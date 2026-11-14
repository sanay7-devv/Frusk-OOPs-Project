package com.iitsm.application.notification;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.notification.NotificationRequest.Person;
import com.iitsm.domain.event.EscalationExhausted;
import com.iitsm.domain.event.IncidentChanged;
import com.iitsm.domain.event.IncidentEscalated;
import com.iitsm.domain.event.SlaViolated;
import com.iitsm.domain.event.SlaWarning;
import com.iitsm.domain.event.TriageNeeded;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.notification.Audience;
import com.iitsm.domain.notification.NotificationEventType;
import com.iitsm.domain.notification.NotificationRules;
import com.iitsm.domain.notification.TeamResolver;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.UserRepository;
import com.iitsm.domain.user.User;

/**
 * Decides who is notified about an event and with which values (handbook 2.5 M9). The rules themselves are in the
 * domain ({@link NotificationEventType#audiences()}, {@link NotificationRules}); this class only looks the people
 * up. One short read-only transaction, then everything it returns is plain data.
 * <p>
 * The person who caused an event is not told about it, except the reporter of a new incident, who gets a receipt.
 */
@Service
public class NotificationPlanner {

    private final IncidentRepository incidents;
    private final UserRepository users;
    private final TeamResolver teams;

    public NotificationPlanner(IncidentRepository incidents, UserRepository users, TeamResolver teams) {
        this.incidents = incidents;
        this.users = users;
        this.teams = teams;
    }

    /** An audited action of a person or the system; empty if the action has no notification type. */
    @Transactional(readOnly = true)
    public List<NotificationRequest> plan(IncidentChanged event) {
        if (!NotificationRules.announced(event.action(), event.newState())) {
            return List.of();
        }
        NotificationEventType type = NotificationEventType.forAction(event.action()).orElse(null);
        Incident incident = type == null ? null : incidents.findById(event.incidentId()).orElse(null);
        if (incident == null) {
            return List.of();
        }
        Map<String, String> extra = new HashMap<>();
        extra.put("detail", event.description());
        if (event.actorId() != null) {
            users.findById(event.actorId()).ifPresent(actor -> extra.put("actor", actor.getName()));
        }
        Long exclude = type == NotificationEventType.INCIDENT_CREATED ? null : event.actorId();
        return plan(incident, type, exclude, extra);
    }

    @Transactional(readOnly = true)
    public List<NotificationRequest> plan(TriageNeeded event) {
        return incidents.findById(event.incidentId())
                .map(incident -> plan(incident, NotificationEventType.TRIAGE_NEEDED, null,
                        Map.of("reason", event.reason())))
                .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public List<NotificationRequest> plan(SlaWarning event) {
        return incidents.findById(event.incidentId())
                .map(incident -> plan(incident, NotificationEventType.SLA_WARNING, null, Map.of(
                        "clock", event.clock().name().toLowerCase(java.util.Locale.ROOT),
                        "percent", String.valueOf(event.percent()),
                        "due", event.due().toString())))
                .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public List<NotificationRequest> plan(SlaViolated event) {
        return incidents.findById(event.incidentId())
                .map(incident -> plan(incident, NotificationEventType.SLA_VIOLATED, null, Map.of(
                        "clock", event.clock().name().toLowerCase(java.util.Locale.ROOT),
                        "overdue", describe(Duration.ofSeconds(event.overdueSeconds())))))
                .orElse(List.of());
    }

    /**
     * One hop up the escalation chain (M11). The event names the holders of the level it reached, decided by the
     * escalation module at that moment, so a hop over a level nobody holds tells nobody, and two hops in one run each
     * tell their own level (ERROR_LOG E-034). The assignee hears about it too; the person who escalated by hand does
     * not.
     */
    @Transactional(readOnly = true)
    public List<NotificationRequest> plan(IncidentEscalated event) {
        return incidents.findById(event.incidentId())
                .map(incident -> {
                    Map<Audience, List<User>> people = new LinkedHashMap<>();
                    people.put(Audience.OWNER, usersOf(event.recipientIds()));
                    people.put(Audience.ASSIGNEE, event.assigneeId() == null ? List.of()
                            : usersOf(List.of(event.assigneeId())));
                    Map<String, String> extra = new HashMap<>();
                    extra.put("level", String.valueOf(event.toLevel()));
                    extra.put("detail", (event.manual() ? "Escalated by hand" : "Not acknowledged in time")
                            + "; now with the " + event.target().getLabel() + ".");
                    return plan(incident, NotificationEventType.INCIDENT_ESCALATED, people, event.actorId(), extra,
                            !event.recipientIds().isEmpty());
                })
                .orElse(List.of());
    }

    /**
     * The one final alert after level 3 (DEC-49): every administrator in the event, worded as "escalation exhausted"
     * (template audience {@code admin}); SMS for P1 and the chat room follow from {@link NotificationRules}.
     */
    @Transactional(readOnly = true)
    public List<NotificationRequest> plan(EscalationExhausted event) {
        return incidents.findById(event.incidentId())
                .map(incident -> plan(incident, NotificationEventType.INCIDENT_ESCALATED,
                        Map.of(Audience.ADMIN, usersOf(event.recipientIds())), null,
                        Map.of("level", "3", "detail", "Escalation exhausted: still not acknowledged at level 3."),
                        true))
                .orElse(List.of());
    }

    // ------------------------------------------------------------------ shared

    private List<NotificationRequest> plan(Incident incident, NotificationEventType type, Long excludeUserId,
                                           Map<String, String> extra) {
        Map<Audience, List<User>> people = new LinkedHashMap<>();
        for (Audience audience : audiencesFor(incident, type)) {
            people.put(audience, resolve(audience, incident));
        }
        return plan(incident, type, people, excludeUserId, extra, true);
    }

    /** Requests for the given people, in the order of the map; someone in two groups is told once. */
    private List<NotificationRequest> plan(Incident incident, NotificationEventType type,
                                           Map<Audience, List<User>> people, Long excludeUserId,
                                           Map<String, String> extra, boolean room) {
        Map<String, String> values = baseValues(incident);
        values.putAll(extra);
        values.putIfAbsent("detail", "");

        Map<Long, NotificationRequest> byPerson = new LinkedHashMap<>();
        for (Map.Entry<Audience, List<User>> group : people.entrySet()) {
            Audience audience = group.getKey();
            for (User user : group.getValue()) {
                if (!user.isActive() || user.getId().equals(excludeUserId) || byPerson.containsKey(user.getId())) {
                    continue;
                }
                byPerson.put(user.getId(), new NotificationRequest(
                        new Person(user.getId(), user.getName(), user.getEmail()), audience, type,
                        NotificationRules.isCritical(user, type), incident.getPriority(), incident.getId(),
                        incident.getCode(), values));
            }
        }
        List<NotificationRequest> requests = new ArrayList<>(byPerson.values());
        if (room && NotificationRules.chatApplies(incident.getPriority(), type)) {
            requests.add(new NotificationRequest(null, Audience.ROOM, type, false, incident.getPriority(),
                    incident.getId(), incident.getCode(), values));
        }
        return requests;
    }

    /** The audiences of the type; an SLA warning for an unassigned incident goes to the team leads instead. */
    private static List<Audience> audiencesFor(Incident incident, NotificationEventType type) {
        if (type == NotificationEventType.SLA_WARNING && incident.getAssignee() == null) {
            return List.of(Audience.TEAM_LEAD);
        }
        return type.audiences();
    }

    private List<User> resolve(Audience audience, Incident incident) {
        return switch (audience) {
            case REPORTER -> List.of(incident.getReporter());
            case ASSIGNEE -> incident.getAssignee() == null ? List.of() : List.of(incident.getAssignee());
            case TEAM_LEAD -> teams.teamLeads(incident);
            case ADMIN -> users.findAllAdministrators();
            case OWNER -> teams.escalationTargets(incident, incident.getEscalationLevel());
            case ROOM -> List.of();
        };
    }

    /** The users with these ids, in the same order; unknown ids are skipped. */
    private List<User> usersOf(List<Long> ids) {
        return ids.stream().map(users::findById).flatMap(java.util.Optional::stream).toList();
    }

    private static Map<String, String> baseValues(Incident incident) {
        Map<String, String> values = new HashMap<>();
        values.put("code", incident.getCode());
        values.put("title", incident.getTitle());
        values.put("priority", incident.getPriority() == null ? "" : incident.getPriority().name());
        values.put("service", incident.getService().getName());
        values.put("status", incident.getStatus().name());
        values.put("reporter", incident.getReporter().getName());
        values.put("assignee", incident.getAssignee() == null ? "nobody yet" : incident.getAssignee().getName());
        values.put("level", String.valueOf(incident.getEscalationLevel()));
        return values;
    }

    /** "2 h 5 min", "45 s": how late a deadline was, in words a person reads. */
    static String describe(Duration duration) {
        long seconds = duration.getSeconds();
        if (seconds < 60) {
            return seconds + " s";
        }
        long minutes = seconds / 60;
        return minutes < 60 ? minutes + " min" : (minutes / 60) + " h " + (minutes % 60) + " min";
    }
}
