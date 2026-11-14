package com.iitsm.infrastructure.persistence;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.intelligence.LabelledText;
import com.iitsm.domain.repository.IncidentTextRepository;

/** Spring Data implementation of {@link IncidentTextRepository}: JPQL queries plus thin adapters to its methods. */
public interface JpaIncidentTextRepository extends Repository<Incident, Long>, IncidentTextRepository {

    @Query("select i from Incident i where i.service.id = :serviceId and i.status in :open "
            + "and i.createdAt >= :from and i.createdAt <= :to and i.id <> :excludeId order by i.createdAt desc")
    List<Incident> openOnService(Long serviceId, java.util.Collection<IncidentStatus> open, Instant from, Instant to,
                                 Long excludeId);

    @Query("select i from Incident i where i.service.id in :serviceIds and i.priority in :priorities "
            + "and i.status in :open and i.createdAt >= :since order by i.createdAt desc")
    List<Incident> openOnServicesWith(java.util.Collection<Long> serviceIds,
                                      java.util.Collection<com.iitsm.domain.priority.Priority> priorities,
                                      java.util.Collection<IncidentStatus> open, Instant since);

    @Override
    default List<Incident> findOpenOnServices(java.util.Collection<Long> serviceIds,
                                              java.util.Collection<com.iitsm.domain.priority.Priority> priorities,
                                              Instant since) {
        return serviceIds.isEmpty() ? List.of() : openOnServicesWith(serviceIds, priorities, IncidentStatus.OPEN, since);
    }

    @Query("select i from Incident i where i.resolvedAt is not null and i.resolvedAt >= :since "
            + "and i.resolution.rootCause is not null order by i.resolvedAt desc")
    List<Incident> resolvedAll(Instant since, Pageable page);

    @Query("select i from Incident i where i.service.id = :serviceId and i.resolvedAt is not null "
            + "and i.resolvedAt >= :since and i.resolution.rootCause is not null order by i.resolvedAt desc")
    List<Incident> resolvedOnService(Long serviceId, Instant since, Pageable page);

    @Query("select concat(i.title, ' ', i.description) from Incident i where i.createdAt >= :since "
            + "order by i.createdAt desc")
    List<String> recentTexts(Instant since, Pageable page);

    @Query("select new com.iitsm.domain.intelligence.LabelledText(i.category.id, concat(i.title, ' ', i.description)) "
            + "from Incident i where i.category is not null and i.createdAt >= :since order by i.createdAt desc")
    List<LabelledText> categorisedTexts(Instant since, Pageable page);

    @Override
    default List<Incident> findOpenOnService(Long serviceId, Instant from, Instant to, Long excludeId) {
        return openOnService(serviceId, IncidentStatus.OPEN, from, to, excludeId == null ? -1L : excludeId);
    }

    @Override
    default List<Incident> findResolved(Long serviceIdOrNull, Instant since, int limit) {
        Pageable page = PageRequest.of(0, limit);
        return serviceIdOrNull == null ? resolvedAll(since, page) : resolvedOnService(serviceIdOrNull, since, page);
    }

    @Override
    default List<String> findRecentTexts(Instant since, int limit) {
        return recentTexts(since, PageRequest.of(0, limit));
    }

    @Override
    default List<LabelledText> findCategorisedTexts(Instant since, int limit) {
        return categorisedTexts(since, PageRequest.of(0, limit));
    }
}
