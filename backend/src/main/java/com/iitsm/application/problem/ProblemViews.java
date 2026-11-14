package com.iitsm.application.problem;

import java.time.Instant;
import java.util.List;

import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.problem.ProblemStatus;

/** What the problem endpoints return (API Data Dictionary C.4 ProblemRecord and the M12 additions). */
public final class ProblemViews {

    private ProblemViews() {
    }

    /**
     * One problem record: {@code lead} is the highest-priority, earliest linked incident (decision DEC-46, G5), and
     * {@code incidents} are all linked incidents, oldest first. {@code joined} counts the employees who joined the
     * known outage with one click (their incidents are closed as duplicates of the lead).
     */
    public record ProblemView(Long id, String title, Ref service, ProblemStatus status, Instant createdAt,
                              IncidentSummary lead, int incidentCount, int joined, List<IncidentSummary> incidents) {
    }

    /**
     * What an employee sees about an open outage, enough to join it and nothing about other people's incidents
     * (no reporter, no description): the record, the lead's code and priority, how many are affected.
     */
    public record KnownOutageView(Long problemId, String title, Ref service, String leadCode, Priority leadPriority,
                                  int affectedUsers, Instant since, boolean alreadyJoined) {
    }

    /** One service on the dependency graph and how far it is from each affected service. */
    public record CauseView(Ref service, int maxDistance, int totalDistance, boolean affected,
                            List<List<Ref>> paths) {
    }

    /**
     * Root cause from the service graph (DEC-73): {@code probable} is the common upstream service closest to every
     * affected service (null when the incidents sit on services with no shared upstream, which is possible for
     * unrelated groupings), {@code candidates} are all common upstream services, best first, with the dependency
     * paths from each affected service as evidence.
     */
    public record RootCauseView(Long problemId, List<Ref> affectedServices, CauseView probable,
                                List<CauseView> candidates, String explanation) {
    }

    /** One pair of service and category that keeps coming back, or one incident reopened again and again (E2). */
    public record RecurringView(Kind kind, Ref service, Ref category, int count, List<IncidentSummary> incidents,
                                String reason) {
        public enum Kind { REPEATED_FIX, REPEATED_REOPEN }
    }
}
