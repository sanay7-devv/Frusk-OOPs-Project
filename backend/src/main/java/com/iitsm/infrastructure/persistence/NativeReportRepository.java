package com.iitsm.infrastructure.persistence;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.report.ReportRows.LabelCount;
import com.iitsm.domain.report.ReportRows.Overview;
import com.iitsm.domain.report.ReportRows.ServiceCategoryUse;
import com.iitsm.domain.report.ReportRows.ServiceCount;
import com.iitsm.domain.report.ReportRows.SlaCompliance;
import com.iitsm.domain.report.ReportRows.TechnicianResolution;
import com.iitsm.domain.report.ReportRows.TrendPoint;
import com.iitsm.domain.report.ReportScope;
import com.iitsm.domain.repository.ReportRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;

/**
 * The report queries as native SQL: one COUNT or GROUP BY per report, run by the database over the incidents the
 * scope allows (decision DEC-42), so a report total equals a direct count by construction. Native SQL is used
 * because FILTER aggregates, date_trunc and time zone casts have no portable JPQL form.
 * <p>
 * Definitions shared by every report (a change here changes them all):
 * <ul>
 *   <li><b>open</b>: status NEW to REOPENED; <b>resolved</b>: RESOLVED, VERIFIED or CLOSED (so open + resolved =
 *       total);</li>
 *   <li><b>violated</b>: the incident has an sla_violations row, or it was resolved after its resolution deadline;
 *       <b>judged</b>: it has a deadline, was not closed as a duplicate or withdrawn, and is either finished or
 *       violated; <b>met</b>: judged and not violated (so met + violated = total in the compliance report).</li>
 * </ul>
 */
@Repository
public class NativeReportRepository implements ReportRepository {

    private static final String OPEN = "('NEW','CLASSIFIED','ASSIGNED','ACKNOWLEDGED','IN_PROGRESS',"
            + "'PENDING_USER_INFO','REOPENED')";
    private static final String FINISHED = "('RESOLVED','VERIFIED','CLOSED')";
    private static final String VIOLATED = "(exists (select 1 from sla_violations v where v.incident_id = i.id)"
            + " or (i.resolved_at is not null and i.resolution_due is not null and i.resolved_at > i.resolution_due))";
    private static final String JUDGED = "(i.resolution_due is not null"
            + " and coalesce(i.closure_reason, '') not in ('DUPLICATE', 'WITHDRAWN')"
            + " and (" + VIOLATED + " or i.status in " + FINISHED + "))";
    private static final String SLA_AGGREGATES = "count(*) filter (where " + JUDGED + "), "
            + "count(*) filter (where " + JUDGED + " and not " + VIOLATED + ")";
    private static final String MINUTES_TO_RESOLVE = "extract(epoch from (i.resolved_at - i.created_at)) / 60.0";

    @PersistenceContext
    private EntityManager em;

    /** A WHERE clause with its named parameters. */
    private record Where(String sql, Map<String, Object> params) {

        static Where of(Long userId, String dateColumn, Instant from, Instant to) {
            StringBuilder sql = new StringBuilder(" where 1 = 1");
            Map<String, Object> params = new HashMap<>();
            if (userId != null) {
                sql.append(" and (i.reporter_id = :uid or i.assignee_id = :uid)");
                params.put("uid", userId);
            }
            if (from != null) {
                sql.append(" and i.").append(dateColumn).append(" >= :from");
                params.put("from", from);
            }
            if (to != null) {
                sql.append(" and i.").append(dateColumn).append(" < :to");
                params.put("to", to);
            }
            return new Where(sql.toString(), params);
        }

        static Where of(ReportScope scope) {
            return of(scope.visibleToUserId(), "created_at", scope.from(), scope.to());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Overview overview(ReportScope scope) {
        Where where = Where.of(scope);
        Object[] row = (Object[]) query("select count(*),"
                + " count(*) filter (where i.status in " + OPEN + "),"
                + " count(*) filter (where i.status in " + OPEN + " and i.priority = 'P1'),"
                + " count(*) filter (where i.status in " + FINISHED + "),"
                + " count(*) filter (where " + JUDGED + " and " + VIOLATED + "),"
                + " coalesce(avg(" + MINUTES_TO_RESOLVE + ") filter (where i.resolved_at >= i.created_at), 0)"
                + " from incidents i" + where.sql(), where.params()).getSingleResult();
        Object satisfaction = query("select avg(f.rating) from feedback f join incidents i on i.id = f.incident_id"
                + where.sql(), where.params()).getSingleResult();
        return new Overview(count(row[0]), count(row[1]), count(row[2]), count(row[3]), count(row[4]),
                ((Number) row[5]).doubleValue(), satisfaction == null ? null : ((Number) satisfaction).doubleValue());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceCount> incidentsPerService(ReportScope scope) {
        Where where = Where.of(scope);
        List<?> rows = query("select s.id, s.name, count(*) from incidents i join services s on s.id = i.service_id"
                + where.sql() + " group by s.id, s.name order by count(*) desc, s.name", where.params())
                .getResultList();
        return rows.stream().map(r -> (Object[]) r)
                .map(r -> new ServiceCount(((Number) r[0]).longValue(), (String) r[1], count(r[2]))).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabelCount> priorityDistribution(ReportScope scope) {
        Where where = Where.of(scope);
        return labelCounts("select coalesce(i.priority, 'UNSET'), count(*) from incidents i" + where.sql()
                + " group by 1 order by 1", where.params());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabelCount> categoryDistribution(ReportScope scope) {
        Where where = Where.of(scope);
        return labelCounts("select coalesce(c.name, 'Uncategorized'), count(*) from incidents i"
                + " left join categories c on c.id = i.category_id" + where.sql()
                + " group by c.id, c.name order by count(*) desc, 1", where.params());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TrendPoint> trends(ReportScope scope, Instant from, Instant to, boolean weekly) {
        Map<String, long[]> byDate = new java.util.TreeMap<>();
        collectTrend(byDate, scope.visibleToUserId(), "created_at", from, to, weekly, 0);
        collectTrend(byDate, scope.visibleToUserId(), "resolved_at", from, to, weekly, 1);
        List<TrendPoint> points = new ArrayList<>();
        byDate.forEach((date, counts) -> points.add(new TrendPoint(date, counts[0], counts[1])));
        return points;
    }

    private void collectTrend(Map<String, long[]> byDate, Long userId, String column, Instant from, Instant to,
                              boolean weekly, int slot) {
        String local = "i." + column + " at time zone 'UTC'";
        String bucket = weekly ? "cast(date_trunc('week', " + local + ") as date)" : "cast(" + local + " as date)";
        Where where = Where.of(userId, column, from, to);
        List<?> rows = query("select " + bucket + ", count(*) from incidents i" + where.sql() + " group by 1",
                where.params()).getResultList();
        for (Object row : rows) {
            Object[] r = (Object[]) row;
            byDate.computeIfAbsent(String.valueOf(r[0]), k -> new long[2])[slot] = count(r[1]);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<SlaCompliance> slaCompliance(ReportScope scope, String groupBy) {
        Where where = Where.of(scope);
        String sql = switch (groupBy) {
            case "PRIORITY" -> "select coalesce(i.priority, 'UNSET'), " + SLA_AGGREGATES + " from incidents i"
                    + where.sql() + " group by 1 order by 1";
            case "SERVICE" -> "select s.name, " + SLA_AGGREGATES
                    + " from incidents i join services s on s.id = i.service_id" + where.sql()
                    + " group by s.id, s.name order by s.name";
            case "TECHNICIAN" -> "select coalesce(u.name, 'Unassigned'), " + SLA_AGGREGATES
                    + " from incidents i left join users u on u.id = i.assignee_id" + where.sql()
                    + " group by u.id, u.name order by 1";
            default -> throw new InputValidationException("groupBy", "must be priority, service or technician");
        };
        List<SlaCompliance> result = new ArrayList<>();
        for (Object row : query(sql, where.params()).getResultList()) {
            Object[] r = (Object[]) row;
            long total = count(r[1]);
            long met = count(r[2]);
            if (total > 0) {
                result.add(new SlaCompliance((String) r[0], total, met, total - met, 100.0 * met / total));
            }
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TechnicianResolution> averageResolutionPerTechnician() {
        List<?> rows = query("select i.assignee_id, avg(" + MINUTES_TO_RESOLVE + ") from incidents i"
                + " where i.resolved_at >= i.created_at and i.assignee_id is not null group by i.assignee_id", Map.of())
                .getResultList();
        return rows.stream().map(r -> (Object[]) r)
                .map(r -> new TechnicianResolution(((Number) r[0]).longValue(), ((Number) r[1]).doubleValue()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceCategoryUse> serviceCategoryUse(Instant since) {
        List<?> rows = query("select i.service_id, i.category_id, count(*) from incidents i"
                + " where i.created_at >= :since and i.category_id is not null group by i.service_id, i.category_id",
                Map.of("since", since)).getResultList();
        return rows.stream().map(r -> (Object[]) r)
                .map(r -> new ServiceCategoryUse(((Number) r[0]).longValue(), ((Number) r[1]).longValue(), count(r[2])))
                .toList();
    }

    private List<LabelCount> labelCounts(String sql, Map<String, Object> params) {
        List<?> rows = query(sql, params).getResultList();
        return rows.stream().map(r -> (Object[]) r)
                .map(r -> new LabelCount(String.valueOf(r[0]), count(r[1]))).toList();
    }

    private Query query(String sql, Map<String, Object> params) {
        Query query = em.createNativeQuery(sql);
        params.forEach(query::setParameter);
        return query;
    }

    private static long count(Object value) {
        return ((Number) value).longValue();
    }
}
