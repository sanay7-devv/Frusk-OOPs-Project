package com.iitsm.infrastructure.persistence;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.iitsm.domain.audit.AuditQuery;
import com.iitsm.domain.audit.AuditRecord;
import com.iitsm.domain.repository.AuditRepository;
import com.iitsm.domain.repository.PageSlice;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

/**
 * JPA implementation of the domain {@link AuditRepository}. Written by hand on the EntityManager (not Spring Data)
 * so that only insert and read exist: the audit trail is append-only.
 */
@Repository
public class JpaAuditRepository implements AuditRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public AuditRecord insert(AuditRecord entry) {
        em.persist(entry);
        return entry;
    }

    @Override
    public List<AuditRecord> findByIncident(Long incidentId) {
        return em.createQuery("select a from AuditRecord a left join fetch a.actor "
                        + "where a.incident.id = :incidentId order by a.createdAt, a.id", AuditRecord.class)
                .setParameter("incidentId", incidentId)
                .getResultList();
    }

    @Override
    public PageSlice<AuditRecord> search(AuditQuery query) {
        CriteriaBuilder cb = em.getCriteriaBuilder();

        CriteriaQuery<AuditRecord> select = cb.createQuery(AuditRecord.class);
        Root<AuditRecord> root = select.from(AuditRecord.class);
        root.fetch("incident", JoinType.LEFT);
        root.fetch("actor", JoinType.LEFT);
        select.where(filters(cb, root, query)).orderBy(cb.desc(root.get("createdAt")), cb.desc(root.get("id")));
        List<AuditRecord> items = em.createQuery(select)
                .setFirstResult(query.page() * query.size())
                .setMaxResults(query.size())
                .getResultList();

        CriteriaQuery<Long> count = cb.createQuery(Long.class);
        Root<AuditRecord> countRoot = count.from(AuditRecord.class);
        count.select(cb.count(countRoot)).where(filters(cb, countRoot, query));
        long total = em.createQuery(count).getSingleResult();
        return new PageSlice<>(items, query.page(), query.size(), total);
    }

    private static Predicate[] filters(CriteriaBuilder cb, Root<AuditRecord> root, AuditQuery query) {
        List<Predicate> where = new ArrayList<>();
        if (query.incidentId() != null) {
            where.add(cb.equal(root.get("incident").get("id"), query.incidentId()));
        }
        if (query.actorId() != null) {
            where.add(cb.equal(root.get("actor").get("id"), query.actorId()));
        }
        if (query.action() != null) {
            where.add(cb.equal(root.get("action"), query.action()));
        }
        if (query.from() != null) {
            where.add(cb.greaterThanOrEqualTo(root.get("createdAt"), query.from()));
        }
        if (query.to() != null) {
            where.add(cb.lessThan(root.get("createdAt"), query.to()));
        }
        return where.toArray(Predicate[]::new);
    }
}
