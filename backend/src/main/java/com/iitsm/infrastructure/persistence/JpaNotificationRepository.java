package com.iitsm.infrastructure.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.notification.ChannelType;
import com.iitsm.domain.notification.Notification;
import com.iitsm.domain.repository.NotificationRepository;
import com.iitsm.domain.repository.PageSlice;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/** JPA implementation of the domain {@link NotificationRepository}. */
@Repository
@Transactional
public class JpaNotificationRepository implements NotificationRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public Notification save(Notification notification) {
        em.persist(notification);
        return notification;
    }

    @Override
    public Optional<Notification> findByIdAndUser(Long id, Long userId) {
        return em.createQuery("select n from Notification n where n.id = :id and n.user.id = :userId",
                        Notification.class)
                .setParameter("id", id)
                .setParameter("userId", userId)
                .getResultStream()
                .findFirst();
    }

    @Override
    public PageSlice<Notification> findPage(Long userId, ChannelType channel, boolean unreadOnly, int page,
                                            int size) {
        String where = "where n.user.id = :userId and n.channel = :channel" + (unreadOnly ? " and n.seen = false" : "");
        List<Notification> items = em.createQuery("select n from Notification n left join fetch n.incident "
                        + where + " order by n.createdAt desc, n.id desc", Notification.class)
                .setParameter("userId", userId)
                .setParameter("channel", channel)
                .setFirstResult(page * size)
                .setMaxResults(size)
                .getResultList();
        long total = em.createQuery("select count(n) from Notification n " + where, Long.class)
                .setParameter("userId", userId)
                .setParameter("channel", channel)
                .getSingleResult();
        return new PageSlice<>(items, page, size, total);
    }

    @Override
    public long countUnread(Long userId, ChannelType channel) {
        return em.createQuery("select count(n) from Notification n "
                        + "where n.user.id = :userId and n.channel = :channel and n.seen = false", Long.class)
                .setParameter("userId", userId)
                .setParameter("channel", channel)
                .getSingleResult();
    }

    @Override
    public int markAllRead(Long userId, ChannelType channel) {
        return em.createQuery("update Notification n set n.seen = true "
                        + "where n.user.id = :userId and n.channel = :channel and n.seen = false")
                .setParameter("userId", userId)
                .setParameter("channel", channel)
                .executeUpdate();
    }
}
