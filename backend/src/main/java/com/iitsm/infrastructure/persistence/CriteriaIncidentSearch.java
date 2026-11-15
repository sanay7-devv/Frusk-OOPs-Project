package com.iitsm.infrastructure.persistence;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentQuery;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.incident.SlaState;
import com.iitsm.domain.intelligence.SlaRiskFlags;
import com.iitsm.domain.repository.IncidentSearch;
import com.iitsm.domain.repository.PageSlice;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

/**
 * Incident search with the JPA Criteria API: every filter is optional and combined with AND, visibility is always
 * applied, and the page query fetch-joins category, service, reporter and assignee so the list needs no extra
 * queries per row (no N+1). A separate count query gives the total.
 */
@Repository
public class CriteriaIncidentSearch implements IncidentSearch {

    /** Allowed sort fields (API names) and their entity paths. */
    private static final Map<String, String> SORT_PATHS = Map.of(
            "createdAt", "createdAt",
            "priority", "priority",
            "status", "status",
            "code", "code",
            "resolutionDue", "sla.resolutionDue");

    private static final List<IncidentStatus> FINISHED =
            List.of(IncidentStatus.RESOLVED, IncidentStatus.VERIFIED, IncidentStatus.CLOSED);

    @PersistenceContext
    private EntityManager em;

    private final SlaRiskFlags riskFlags;

    public CriteriaIncidentSearch(SlaRiskFlags riskFlags) {
        this.riskFlags = riskFlags;
    }

    @Override
    @Transactional(readOnly = true)
    public PageSlice<Incident> search(IncidentQuery query) {
        CriteriaBuilder cb = em.getCriteriaBuilder();

        CriteriaQuery<Incident> select = cb.createQuery(Incident.class);
        Root<Incident> root = select.from(Incident.class);
        root.fetch("category", JoinType.LEFT);
        root.fetch("service", JoinType.INNER);
        root.fetch("reporter", JoinType.INNER);
        root.fetch("assignee", JoinType.LEFT);
        select.select(root).where(filters(cb, root, query));
        Path<?> sortPath = path(root, SORT_PATHS.getOrDefault(query.sortField(), "createdAt"));
        select.orderBy(query.ascending() ? cb.asc(sortPath) : cb.desc(sortPath), cb.desc(root.get("id")));
        List<Incident> items = em.createQuery(select)
                .setFirstResult(query.page() * query.size())
                .setMaxResults(query.size())
                .getResultList();

        CriteriaQuery<Long> count = cb.createQuery(Long.class);
        Root<Incident> countRoot = count.from(Incident.class);
        count.select(cb.count(countRoot)).where(filters(cb, countRoot, query));
        long total = em.createQuery(count).getSingleResult();

        return new PageSlice<>(items, query.page(), query.size(), total);
    }

    private Predicate[] filters(CriteriaBuilder cb, Root<Incident> root, IncidentQuery q) {
        List<Predicate> where = new ArrayList<>();
        if (q.visibleToUserId() != null) {
            where.add(cb.or(
                    cb.equal(root.get("reporter").get("id"), q.visibleToUserId()),
                    cb.equal(root.get("assignee").get("id"), q.visibleToUserId())));
        }
        if (!q.statuses().isEmpty()) {
            where.add(root.get("status").in(q.statuses()));
        }
        if (!q.priorities().isEmpty()) {
            where.add(root.get("priority").in(q.priorities()));
        }
        if (q.categoryId() != null) {
            where.add(cb.equal(root.get("category").get("id"), q.categoryId()));
        }
        if (q.serviceId() != null) {
            where.add(cb.equal(root.get("service").get("id"), q.serviceId()));
        }
        if (q.assigneeId() != null) {
            where.add(cb.equal(root.get("assignee").get("id"), q.assigneeId()));
        }
        if (q.reporterId() != null) {
            where.add(cb.equal(root.get("reporter").get("id"), q.reporterId()));
        }
        if (q.code() != null && !q.code().isBlank()) {
            where.add(cb.equal(cb.upper(root.get("code")), q.code().strip().toUpperCase(Locale.ROOT)));
        }
        if (q.text() != null && !q.text().isBlank()) {
            String pattern = "%" + q.text().strip().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            where.add(cb.or(
                    cb.like(cb.lower(root.get("title")), pattern, '\\'),
                    cb.like(cb.lower(root.get("description")), pattern, '\\'),
                    cb.like(cb.lower(root.get("code")), pattern, '\\')));
        }
        if (q.createdFrom() != null) {
            where.add(cb.greaterThanOrEqualTo(root.get("createdAt"), q.createdFrom()));
        }
        if (q.createdTo() != null) {
            where.add(cb.lessThan(root.get("createdAt"), q.createdTo()));
        }
        if (q.slaState() != null) {
            where.add(slaState(cb, root, q.slaState(), riskFlags.flaggedIds()));
        }
        if (q.minEscalationLevel() != null) {
            where.add(cb.greaterThanOrEqualTo(root.<Short>get("escalationLevel"), q.minEscalationLevel().shortValue()));
        }
        return where.toArray(Predicate[]::new);
    }

    /**
     * The SLA state filter, written from the stored fire-once flags and the status (decision DEC-42): the shown state
     * of {@code SlaTracker.stateAt} needs business-hours elapsed time, which SQL cannot compute. So this follows
     * the same branches (no deadline, finished, paused, violated, warned) but reads the flags the SLA monitor wrote,
     * and can trail the detail view by up to one monitor interval. AT_RISK (M12) is an open, running, not violated
     * incident whose id the risk scan flagged ({@link SlaRiskFlags}); it takes over from OK and WARNING, so those two
     * filters leave the flagged ids out and the list agrees with the shown state.
     */
    private static Predicate slaState(CriteriaBuilder cb, Root<Incident> root, SlaState wanted,
                                      java.util.Set<Long> flagged) {
        Path<Object> sla = root.get("sla");
        Predicate hasDue = cb.isNotNull(sla.get("resolutionDue"));
        Predicate finished = root.get("status").in(FINISHED);
        Predicate open = cb.not(finished);
        Predicate paused = cb.isNotNull(sla.get("pausedAt"));
        Predicate violatedFlag = cb.or(cb.isTrue(sla.get("responseViolated")), cb.isTrue(sla.get("resolutionViolated")));
        Predicate warnedFlag = cb.or(
                cb.isTrue(sla.get("resolutionFirstWarningSent")), cb.isTrue(sla.get("resolutionSecondWarningSent")),
                cb.and(cb.isNull(root.get("acknowledgedAt")),
                        cb.or(cb.isTrue(sla.get("responseFirstWarningSent")),
                                cb.isTrue(sla.get("responseSecondWarningSent")))));
        Predicate met = cb.and(hasDue, finished, cb.isNotNull(root.get("resolvedAt")),
                cb.lessThanOrEqualTo(root.<Instant>get("resolvedAt"), sla.<Instant>get("resolutionDue")),
                cb.not(violatedFlag));
        Predicate openRunning = cb.and(hasDue, open, cb.not(paused));
        Predicate riskFlagged = flagged.isEmpty() ? cb.disjunction() : root.get("id").in(flagged);
        Predicate notRiskFlagged = cb.not(riskFlagged);
        return switch (wanted) {
            case MET -> met;
            case PAUSED -> cb.and(hasDue, open, paused);
            case VIOLATED -> cb.or(cb.and(openRunning, violatedFlag), cb.and(hasDue, finished, cb.not(met)));
            case WARNING -> cb.and(openRunning, cb.not(violatedFlag), warnedFlag, notRiskFlagged);
            case OK -> cb.or(cb.not(hasDue),
                    cb.and(openRunning, cb.not(violatedFlag), cb.not(warnedFlag), notRiskFlagged));
            case AT_RISK -> cb.and(openRunning, cb.not(violatedFlag), riskFlagged);
        };
    }

    private static Path<?> path(Root<Incident> root, String dotted) {
        Path<?> path = root;
        for (String part : dotted.split("\\.")) {
            path = path.get(part);
        }
        return path;
    }
}
