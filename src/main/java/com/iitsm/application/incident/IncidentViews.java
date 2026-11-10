package com.iitsm.application.incident;

import java.time.Instant;
import java.util.List;

import com.iitsm.domain.category.Category;
import com.iitsm.domain.incident.ClosureReason;
import com.iitsm.domain.incident.CommentVisibility;
import com.iitsm.domain.incident.IncidentAction;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.incident.SlaState;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.priority.PriorityBreakdown;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.user.User;

/** Read-only incident shapes (API Data Dictionary C.4), built inside the transaction. */
public final class IncidentViews {

    private IncidentViews() {
    }

    public record Ref(Long id, String name) {
        static Ref of(User user) {
            return user == null ? null : new Ref(user.getId(), user.getName());
        }

        static Ref of(ItService service) {
            return new Ref(service.getId(), service.getName());
        }

        static Ref of(Category category) {
            return category == null ? null : new Ref(category.getId(), category.getName());
        }
    }

    /** One row of every incident list. */
    public record IncidentSummary(Long id, String code, String title, IncidentStatus status, Priority priority,
                                  Ref category, Ref service, Ref reporter, Ref assignee, Instant createdAt,
                                  Instant responseDue, Instant resolutionDue, SlaState slaState, boolean major,
                                  int escalationLevel) {
    }

    public record ResolutionView(String rootCause, String notes, String steps, Integer timeSpentMinutes,
                                 boolean reusableSolution, Ref resolvedBy) {
    }

    /**
     * Everything about one incident, plus what the current user may do with it. {@code version} is an addition to
     * the contract: send it back on PUT to be told if someone else changed the incident meanwhile.
     */
    public record IncidentDetail(Long id, String code, String title, IncidentStatus status, Priority priority,
                                 Ref category, Ref service, Ref reporter, Ref assignee, Instant createdAt,
                                 Instant responseDue, Instant resolutionDue, SlaState slaState, boolean major,
                                 int escalationLevel, String description, int impact, int urgency,
                                 int affectedUsers, Integer priorityScore, PriorityBreakdown priorityBreakdown,
                                 Instant acknowledgedAt, Instant resolvedAt, Instant closedAt,
                                 ClosureReason closureReason, Long problemId, Long duplicateOfId, int reopenCount,
                                 Instant pausedAt, ResolutionView resolution, Object feedback,
                                 List<IncidentAction> allowedActions, long version) {
    }

    public record CommentView(Long id, Long incidentId, Ref author, CommentVisibility visibility, String body,
                              Instant createdAt) {
    }
}
