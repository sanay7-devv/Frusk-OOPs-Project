package com.iitsm.application.report;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.incident.SlaState;
import com.iitsm.domain.priority.Priority;

/**
 * Report shapes (API Data Dictionary C.8) and the two reports added in module M10: coverage risk (E3) and the
 * post-incident report (E4). The names match the schemas of the contract.
 */
public final class ReportViews {

    private ReportViews() {
    }

    public record ReportOverview(long total, long open, long critical, long resolved, long slaViolations,
                                 double avgResolutionMinutes, Double avgSatisfaction) {
    }

    public record WorkloadReportRow(Long technicianId, String name, int active, int load, int maxLoad,
                                    double avgResolutionMinutes) {
    }

    public record ServiceReportRow(Long serviceId, String name, long count) {
    }

    public record TrendPoint(LocalDate date, long created, long resolved) {
    }

    public record LabelCount(String label, long count) {
    }

    public record SlaComplianceRow(String label, long total, long met, long violated, double compliancePercent) {
    }

    // ------------------------------------------------------------------ E3 coverage risk

    /** A skill a category needs and how many available technicians hold it. */
    public record SkillCoverage(Long skillId, String name, int holders) {
    }

    public enum CoverageLevel { NO_COVERAGE, SINGLE_HOLDER, THIN, COVERED }

    /**
     * One service and category pair seen on incidents in the window.
     *
     * @param eligibleTechnicians available technicians the assignment engine would accept for this category
     * @param flagged             the service is critical and fewer technicians than the minimum can take its incidents
     */
    public record CoverageItem(Ref service, int criticality, Ref category, long incidentsInWindow,
                               List<SkillCoverage> requiredSkills, int eligibleCount, List<Ref> eligibleTechnicians,
                               CoverageLevel level, boolean flagged, String message) {
    }

    public record CoverageRiskReport(Instant generatedAt, int windowDays, int minCriticality, int minHolders,
                                     int availableTechnicians, long flaggedCount, List<CoverageItem> items) {
    }

    // ------------------------------------------------------------------ E4 post-incident report

    public record TimelineEntry(Instant at, Ref actor, String action, IncidentStatus from, IncidentStatus to,
                                String description) {
    }

    /** Wall-clock time spent in one status, over all visits (a reopened incident visits some twice). */
    public record StatusDuration(IncidentStatus status, long seconds, int visits, boolean stillIn) {
    }

    public record SlaViolationEntry(String clock, long overdueSeconds, Instant recordedAt, Ref technician) {
    }

    /**
     * @param responseMet   null while the response clock still runs inside its deadline
     * @param resolutionMet null while the resolution clock still runs inside its deadline
     * @param outcome       MET, VIOLATED, or the live state (OK, WARNING, PAUSED) while the incident is open
     */
    public record SlaOutcome(SlaState state, String outcome, Instant responseDue, Instant acknowledgedAt,
                             Boolean responseMet, Instant resolutionDue, Instant resolvedAt, Boolean resolutionMet,
                             List<SlaViolationEntry> violations) {
    }

    public record PersonInvolved(Ref person, List<String> roles, int actions) {
    }

    public record ResolutionSummary(String rootCause, String notes, String steps, Integer timeSpentMinutes) {
    }

    public record PostIncidentReport(Long incidentId, String code, String title, IncidentStatus status,
                                     Priority priority, Ref service, Ref category, Instant createdAt,
                                     Instant resolvedAt, Instant closedAt, int reopenCount, boolean complete,
                                     Instant generatedAt, long totalSeconds, SlaOutcome sla,
                                     List<StatusDuration> timeInStatus, List<PersonInvolved> people,
                                     ResolutionSummary resolution, Integer satisfaction,
                                     List<TimelineEntry> timeline) {
    }
}
