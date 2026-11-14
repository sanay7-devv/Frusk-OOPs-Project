package com.iitsm.infrastructure.persistence;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.repository.DashboardRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * The dashboard, graph and status board queries (module M13). Open means NEW to REOPENED, the same definition as
 * the reports ({@link NativeReportRepository}).
 */
@Repository
public class NativeDashboardRepository implements DashboardRepository {

    private static final String OPEN = "('NEW','CLASSIFIED','ASSIGNED','ACKNOWLEDGED','IN_PROGRESS',"
            + "'PENDING_USER_INFO','REOPENED')";
    /** Statuses in which the response clock still runs, so a response warning still matters. */
    private static final Collection<IncidentStatus> BEFORE_ACKNOWLEDGED =
            EnumSet.of(IncidentStatus.NEW, IncidentStatus.CLASSIFIED, IncidentStatus.ASSIGNED);

    @PersistenceContext
    private EntityManager em;

    @Override
    @Transactional(readOnly = true)
    public List<OpenCount> openIncidentsByServiceAndPriority() {
        List<?> rows = em.createNativeQuery("select i.service_id, i.priority, count(*) from incidents i"
                + " where i.status in " + OPEN + " group by i.service_id, i.priority").getResultList();
        List<OpenCount> result = new ArrayList<>();
        for (Object row : rows) {
            Object[] r = (Object[]) row;
            result.add(new OpenCount(((Number) r[0]).longValue(), priority(r[1]), ((Number) r[2]).longValue()));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<IncidentHeader> header(Long incidentId) {
        List<?> rows = em.createNativeQuery("select i.code, i.priority, i.status from incidents i where i.id = :id")
                .setParameter("id", incidentId).getResultList();
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        Object[] r = (Object[]) rows.get(0);
        return Optional.of(new IncidentHeader(incidentId, (String) r[0], priority(r[1]),
                IncidentStatus.valueOf((String) r[2])));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecentAction> recentActions(Collection<AuditAction> actions, int limit) {
        if (actions.isEmpty() || limit <= 0) {
            return List.of();
        }
        List<?> rows = em.createNativeQuery("select a.action, i.id, i.code, i.priority,"
                        + " coalesce(a.new_state, i.status), a.created_at"
                        + " from audit_records a join incidents i on i.id = a.incident_id"
                        + " where a.action in (:actions) order by a.created_at desc, a.id desc limit :limit")
                .setParameter("actions", actions.stream().map(Enum::name).toList())
                .setParameter("limit", limit)
                .getResultList();
        List<RecentAction> result = new ArrayList<>();
        for (Object row : rows) {
            Object[] r = (Object[]) row;
            result.add(new RecentAction(AuditAction.valueOf((String) r[0]), ((Number) r[1]).longValue(),
                    (String) r[2], priority(r[3]), IncidentStatus.valueOf((String) r[4]), instant(r[5])));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Incident> atRisk(Collection<Long> flaggedIds, int limit) {
        List<Long> flagged = flaggedIds.isEmpty() ? List.of(-1L) : List.copyOf(flaggedIds);
        return em.createQuery("select i from Incident i join fetch i.service join fetch i.reporter"
                        + " left join fetch i.category left join fetch i.assignee"
                        + " where i.status in :open and i.sla.responseViolated = false"
                        + " and i.sla.resolutionViolated = false"
                        + " and (i.sla.resolutionFirstWarningSent = true or i.id in :flagged"
                        + "      or (i.sla.responseFirstWarningSent = true and i.status in :beforeAck))"
                        + " order by i.sla.resolutionDue asc nulls last, i.id asc", Incident.class)
                .setParameter("open", IncidentStatus.OPEN)
                .setParameter("flagged", flagged)
                .setParameter("beforeAck", BEFORE_ACKNOWLEDGED)
                .setMaxResults(limit)
                .getResultList();
    }

    private static Priority priority(Object value) {
        return value == null ? null : Priority.valueOf((String) value);
    }

    private static Instant instant(Object value) {
        return switch (value) {
            case Instant i -> i;
            case Timestamp t -> t.toInstant();
            case OffsetDateTime o -> o.toInstant();
            default -> Instant.parse(String.valueOf(value));
        };
    }
}
