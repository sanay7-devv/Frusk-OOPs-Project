package com.iitsm.infrastructure.persistence;

import java.util.Collection;
import java.util.List;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.notification.NotificationPreference;
import com.iitsm.domain.repository.NotificationPreferenceRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/** JPA implementation of the domain {@link NotificationPreferenceRepository}. */
@Repository
@Transactional
public class JpaNotificationPreferenceRepository implements NotificationPreferenceRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationPreference> findByUser(Long userId) {
        return em.createQuery("select p from NotificationPreference p where p.id.userId = :userId",
                        NotificationPreference.class)
                .setParameter("userId", userId)
                .getResultList();
    }

    @Override
    public void replaceAll(Long userId, Collection<NotificationPreference> preferences) {
        em.createQuery("delete from NotificationPreference p where p.id.userId = :userId")
                .setParameter("userId", userId)
                .executeUpdate();
        preferences.forEach(em::persist);
    }
}
