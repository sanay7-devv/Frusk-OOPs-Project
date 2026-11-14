package com.iitsm.domain.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import com.iitsm.domain.audit.AuditFacts;
import com.iitsm.domain.audit.AuditSeal;
import com.iitsm.domain.audit.AuditSealEntry;

/** Repository pattern: seals over the audit trail (S3). Insert and read only, like the trail itself. */
public interface AuditSealRepository {

    /** Takes a lock held until the transaction ends, so two instances never seal the same records. */
    void lockForSealing();

    Optional<AuditSeal> latest();

    /** Every seal, oldest first. */
    List<AuditSeal> all();

    List<AuditSealEntry> entries(Long sealId);

    /** Stores the seal and one entry per record; the seal gets its id first. */
    AuditSeal insert(AuditSeal seal, List<AuditFacts> records, List<String> digests);

    /** Records with an id above {@code afterId} written before {@code createdBefore}, by id, at most {@code limit}. */
    List<AuditFacts> factsAfter(long afterId, Instant createdBefore, int limit);

    /** Records with {@code fromId <= id <= toId}, by id. */
    List<AuditFacts> factsBetween(long fromId, long toId);

    /** How many records have an id above {@code id} (written but not sealed yet). */
    long countAfter(long id);
}
