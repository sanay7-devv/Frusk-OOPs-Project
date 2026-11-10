package com.iitsm.infrastructure.persistence;

import java.time.Instant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.iitsm.domain.repository.PageSlice;
import com.iitsm.domain.repository.SlaViolationRepository;
import com.iitsm.domain.sla.SlaViolation;

/**
 * Spring Data implementation of the domain {@link SlaViolationRepository}. Extends the bare {@link Repository} so
 * no delete or update method exists: violations are append-only.
 */
public interface JpaSlaViolationRepository extends Repository<SlaViolation, Long>, SlaViolationRepository {

    @Query(value = "select v from SlaViolation v join fetch v.incident left join fetch v.technician "
            + "where v.createdAt >= :from and v.createdAt < :to",
            countQuery = "select count(v) from SlaViolation v where v.createdAt >= :from and v.createdAt < :to")
    Page<SlaViolation> findPage(Instant from, Instant to, Pageable pageable);

    @Override
    default PageSlice<SlaViolation> findRecorded(Instant from, Instant to, int page, int size) {
        Page<SlaViolation> result = findPage(from, to,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
        return new PageSlice<>(result.getContent(), page, size, result.getTotalElements());
    }
}
