package com.iitsm.domain.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.iitsm.domain.problem.ProblemRecord;
import com.iitsm.domain.problem.ProblemStatus;

/** Repository pattern: storage of problem records. */
public interface ProblemRepository {

    Optional<ProblemRecord> findById(Long id);

    /** Newest first; a null status means every record. */
    List<ProblemRecord> findAllByStatusOrdered(ProblemStatus statusOrNull);

    /** Open records on any of the given services, newest first. */
    List<ProblemRecord> findOpenOnServices(Collection<Long> serviceIds);

    ProblemRecord save(ProblemRecord record);
}
