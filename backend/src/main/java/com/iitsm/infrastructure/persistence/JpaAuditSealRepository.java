package com.iitsm.infrastructure.persistence;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.audit.AuditFacts;
import com.iitsm.domain.audit.AuditSeal;
import com.iitsm.domain.audit.AuditSealEntry;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.repository.AuditSealRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/** JPA implementation of {@link AuditSealRepository}; records are read as plain columns, never as entities. */
@Repository
public class JpaAuditSealRepository implements AuditSealRepository {

    private static final String FACTS = "select a.id, a.createdAt, a.actor.id, a.action, a.incident.id, "
            + "a.previousState, a.newState, a.description from AuditRecord a ";

    @PersistenceContext
    private EntityManager em;

    @Override
    public void lockForSealing() {
        em.createNativeQuery("select pg_advisory_xact_lock(7305001)").getSingleResult();
    }

    @Override
    public Optional<AuditSeal> latest() {
        return em.createQuery("select s from AuditSeal s order by s.id desc", AuditSeal.class)
                .setMaxResults(1).getResultList().stream().findFirst();
    }

    @Override
    public List<AuditSeal> all() {
        return em.createQuery("select s from AuditSeal s order by s.id", AuditSeal.class).getResultList();
    }

    @Override
    public List<AuditSealEntry> entries(Long sealId) {
        return em.createQuery("select e from AuditSealEntry e where e.sealId = :sealId order by e.recordId",
                AuditSealEntry.class).setParameter("sealId", sealId).getResultList();
    }

    @Override
    public AuditSeal insert(AuditSeal seal, List<AuditFacts> records, List<String> digests) {
        em.persist(seal);
        em.flush(); // the id of the seal is needed by its entries
        for (int i = 0; i < records.size(); i++) {
            em.persist(new AuditSealEntry(records.get(i).id(), seal.getId(), digests.get(i)));
        }
        return seal;
    }

    @Override
    public List<AuditFacts> factsAfter(long afterId, Instant createdBefore, int limit) {
        return facts(em.createQuery(FACTS + "where a.id > :after and a.createdAt < :before order by a.id",
                        Object[].class)
                .setParameter("after", afterId).setParameter("before", createdBefore)
                .setMaxResults(limit).getResultList());
    }

    @Override
    public List<AuditFacts> factsBetween(long fromId, long toId) {
        return facts(em.createQuery(FACTS + "where a.id >= :from and a.id <= :to order by a.id", Object[].class)
                .setParameter("from", fromId).setParameter("to", toId).getResultList());
    }

    @Override
    public long countAfter(long id) {
        return em.createQuery("select count(a) from AuditRecord a where a.id > :id", Long.class)
                .setParameter("id", id).getSingleResult();
    }

    private static List<AuditFacts> facts(List<Object[]> rows) {
        List<AuditFacts> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            out.add(new AuditFacts((Long) r[0], (Instant) r[1], (Long) r[2], (AuditAction) r[3], (Long) r[4],
                    (IncidentStatus) r[5], (IncidentStatus) r[6], (String) r[7]));
        }
        return out;
    }
}
