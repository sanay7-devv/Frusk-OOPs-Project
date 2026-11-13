package com.iitsm.application.incident;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.escalation.EscalationPreviewer;
import com.iitsm.application.incident.IncidentViews.CommentView;
import com.iitsm.application.incident.IncidentViews.IncidentDetail;
import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.application.incident.IncidentViews.ResolutionView;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.SlaNotConfiguredException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentComment;
import com.iitsm.domain.incident.Resolution;
import com.iitsm.domain.incident.SlaState;
import com.iitsm.domain.sla.SlaPolicy;
import com.iitsm.domain.sla.SlaPolicyResolver;
import com.iitsm.domain.sla.SlaTargets;

/**
 * Turns incidents into the API shapes, computing the SLA state centrally (handbook 2.5 M7: "slaState is computed
 * centrally and used by search and the UI") and the caller's allowedActions.
 */
@Component
public class IncidentViewMapper {

    private final SlaPolicyResolver slaPolicies;
    private final ConfigService config;
    private final IncidentAccessPolicy access;
    private final EscalationPreviewer escalationPreviews;
    private final Clock clock;

    public IncidentViewMapper(SlaPolicyResolver slaPolicies, ConfigService config, IncidentAccessPolicy access,
                              EscalationPreviewer escalationPreviews, Clock clock) {
        this.slaPolicies = slaPolicies;
        this.config = config;
        this.access = access;
        this.escalationPreviews = escalationPreviews;
        this.clock = clock;
    }

    /** Remembers SLA policies per service and priority while one list is built, so a page costs few lookups. */
    public final class SummaryBuilder {
        private final Map<String, Optional<SlaPolicy>> policyCache = new HashMap<>();
        private final Instant now = clock.instant();
        private final int firstWarning = config.current().intValue(ConfigKey.SLA_WARN_FIRST_PERCENT);

        public IncidentSummary summary(Incident incident) {
            return new IncidentSummary(incident.getId(), incident.getCode(), incident.getTitle(),
                    incident.getStatus(), incident.getPriority(), Ref.of(incident.getCategory()),
                    Ref.of(incident.getService()), Ref.of(incident.getReporter()), Ref.of(incident.getAssignee()),
                    incident.getCreatedAt(), incident.getSla().getResponseDue(),
                    incident.getSla().getResolutionDue(), slaState(incident, policyCache, now, firstWarning),
                    incident.isMajor(), incident.getEscalationLevel());
        }
    }

    public SummaryBuilder summaries() {
        return new SummaryBuilder();
    }

    public IncidentDetail detail(Incident incident, AuthenticatedUser caller) {
        AppSettings settings = config.current();
        Instant now = clock.instant();
        SlaState slaState = slaState(incident, new HashMap<>(), now,
                settings.intValue(ConfigKey.SLA_WARN_FIRST_PERCENT));
        Resolution r = incident.getResolution();
        ResolutionView resolution = r == null ? null : new ResolutionView(r.getRootCause(), r.getNotes(),
                r.getSteps(), r.getTimeSpentMinutes(), r.isReusable(), Ref.of(incident.getAssignee()));
        return new IncidentDetail(incident.getId(), incident.getCode(), incident.getTitle(), incident.getStatus(),
                incident.getPriority(), Ref.of(incident.getCategory()), Ref.of(incident.getService()),
                Ref.of(incident.getReporter()), Ref.of(incident.getAssignee()), incident.getCreatedAt(),
                incident.getSla().getResponseDue(), incident.getSla().getResolutionDue(), slaState,
                incident.isMajor(), incident.getEscalationLevel(), incident.getDescription(), incident.getImpact(),
                incident.getUrgency(), incident.getAffectedUsers(), incident.getPriorityScore(),
                incident.getPriorityBreakdown(), incident.getAcknowledgedAt(), incident.getResolvedAt(),
                incident.getClosedAt(), incident.getClosureReason(), incident.getProblemId(),
                incident.getDuplicateOf() == null ? null : incident.getDuplicateOf().getId(),
                incident.getReopenCount(), incident.getSla().getPausedAt(), resolution, null,
                staffSeesPreview(caller, incident) ? escalationPreviews.preview(incident, now) : null,
                access.allowedActions(caller, incident, now, settings.reopenWindow()).stream().sorted().toList(),
                incident.getVersion());
    }

    /** The escalation preview names people and timers, so only staff on the incident see it. */
    private boolean staffSeesPreview(AuthenticatedUser caller, Incident incident) {
        return access.seesAll(caller) || incident.isAssignedTo(caller.id());
    }

    public CommentView comment(IncidentComment comment) {
        return new CommentView(comment.getId(), comment.getIncident().getId(), Ref.of(comment.getAuthor()),
                comment.getVisibility(), comment.getBody(), comment.getCreatedAt());
    }

    private SlaState slaState(Incident incident, Map<String, Optional<SlaPolicy>> cache, Instant now,
                              int firstWarningPercent) {
        Optional<SlaPolicy> policy = incident.getPriority() == null ? Optional.empty()
                : cache.computeIfAbsent(incident.getService().getId() + ":" + incident.getPriority(),
                        key -> findPolicy(incident));
        SlaTargets targets = policy.map(p -> p.targets(config.current())).orElse(null);
        return incident.getSla().stateAt(now, incident.getStatus(), incident.getAcknowledgedAt(),
                incident.getResolvedAt(), targets, firstWarningPercent);
    }

    /** A policy deleted after the incident was created must not break the list: the state then ignores warnings. */
    private Optional<SlaPolicy> findPolicy(Incident incident) {
        try {
            return Optional.of(slaPolicies.resolve(incident.getService(), incident.getPriority()));
        } catch (SlaNotConfiguredException ex) {
            return Optional.empty();
        }
    }
}
