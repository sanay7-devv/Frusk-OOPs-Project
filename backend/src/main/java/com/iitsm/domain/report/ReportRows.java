package com.iitsm.domain.report;

/** Result rows of the report queries (API Data Dictionary C.8). Plain values, free of Spring and JPA types. */
public final class ReportRows {

    private ReportRows() {
    }

    /**
     * @param open          incidents not yet resolved (NEW to REOPENED)
     * @param critical      open incidents of priority P1
     * @param resolved      incidents in RESOLVED, VERIFIED or CLOSED
     * @param slaViolations incidents that missed an SLA deadline (same rule as {@link SlaCompliance#violated})
     */
    public record Overview(long total, long open, long critical, long resolved, long slaViolations,
                           double avgResolutionMinutes, Double avgSatisfaction) {
    }

    public record ServiceCount(Long serviceId, String name, long count) {
    }

    public record LabelCount(String label, long count) {
    }

    public record TrendPoint(String date, long created, long resolved) {
    }

    /** SLA outcome of one group: {@code total = met + violated}. */
    public record SlaCompliance(String label, long total, long met, long violated, double compliancePercent) {
    }

    /** Average resolution time of one technician over the incidents they resolved. */
    public record TechnicianResolution(Long technicianId, double avgResolutionMinutes) {
    }

    /** How often a service and category were seen together on incidents since a moment (coverage risk). */
    public record ServiceCategoryUse(Long serviceId, Long categoryId, long incidents) {
    }
}
