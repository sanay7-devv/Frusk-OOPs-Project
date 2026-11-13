package com.iitsm.domain.repository;

import java.time.Instant;
import java.util.List;

import com.iitsm.domain.report.ReportRows.LabelCount;
import com.iitsm.domain.report.ReportRows.Overview;
import com.iitsm.domain.report.ReportRows.ServiceCategoryUse;
import com.iitsm.domain.report.ReportRows.ServiceCount;
import com.iitsm.domain.report.ReportRows.SlaCompliance;
import com.iitsm.domain.report.ReportRows.TechnicianResolution;
import com.iitsm.domain.report.ReportRows.TrendPoint;
import com.iitsm.domain.report.ReportScope;

/**
 * Repository pattern: the aggregate queries behind the reports. Every number comes from one GROUP BY or COUNT in
 * the database over the incidents the scope allows, so a total always equals a direct count (decision DEC-42).
 */
public interface ReportRepository {

    Overview overview(ReportScope scope);

    List<ServiceCount> incidentsPerService(ReportScope scope);

    List<LabelCount> priorityDistribution(ReportScope scope);

    List<LabelCount> categoryDistribution(ReportScope scope);

    /**
     * Incidents created and resolved per bucket (created in [from, to) and resolved in [from, to) respectively, both
     * inside the scope's visibility). Empty buckets are left out; the service fills them.
     */
    List<TrendPoint> trends(ReportScope scope, Instant from, Instant to, boolean weekly);

    /** groupBy is PRIORITY, SERVICE or TECHNICIAN. */
    List<SlaCompliance> slaCompliance(ReportScope scope, String groupBy);

    List<TechnicianResolution> averageResolutionPerTechnician();

    /** Service and category pairs seen on incidents created since the given moment. */
    List<ServiceCategoryUse> serviceCategoryUse(Instant since);
}
