package com.iitsm.infrastructure.persistence;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.iitsm.domain.problem.ProblemRecord;
import com.iitsm.domain.problem.ProblemStatus;
import com.iitsm.domain.repository.ProblemRepository;

/** Spring Data implementation of the domain {@link ProblemRepository}. */
public interface JpaProblemRepository extends JpaRepository<ProblemRecord, Long>, ProblemRepository {

    @Query("select p from ProblemRecord p join fetch p.service where (:status is null or p.status = :status) "
            + "order by p.createdAt desc, p.id desc")
    List<ProblemRecord> byStatus(ProblemStatus status);

    @Override
    default List<ProblemRecord> findAllByStatusOrdered(ProblemStatus statusOrNull) {
        return byStatus(statusOrNull);
    }

    @Override
    @Query("select p from ProblemRecord p join fetch p.service where p.status = com.iitsm.domain.problem.ProblemStatus.OPEN "
            + "and p.service.id in :serviceIds order by p.createdAt desc, p.id desc")
    List<ProblemRecord> findOpenOnServices(Collection<Long> serviceIds);
}
