package com.iitsm.application.audit;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.domain.audit.AuditChainVerifier;
import com.iitsm.domain.audit.AuditFacts;
import com.iitsm.domain.audit.AuditSeal;
import com.iitsm.domain.audit.AuditSealing;
import com.iitsm.domain.repository.AuditSealRepository;

/**
 * The sealed audit trail (S3, DEC-44, DEC-91). {@link #seal} hashes the audit records written since the last seal
 * together with the previous seal's hash and stores the result; {@link #verify} recomputes the whole chain and names
 * the first record or seal that no longer matches. Each new seal hash is written to the log, a place outside the
 * database that someone who edits the database cannot reach.
 * <p>
 * A scheduled run seals only records older than {@link #SETTLE_SECONDS}: an audit row gets its id when it is inserted
 * but becomes visible when its transaction commits, so a very young row with a lower id could still appear after a
 * higher one was sealed. "Seal now" (admin, for the demo) skips that wait.
 */
@Service
public class AuditSealService {

    private static final Logger log = LoggerFactory.getLogger(AuditSealService.class);

    /** Records younger than this are left for the next scheduled seal. */
    static final int SETTLE_SECONDS = 10;
    /** Most records one seal covers; a larger backlog is sealed over several runs. */
    static final int MAX_BATCH = 5000;

    /** A seal as the API shows it. */
    public record SealView(Long id, long fromId, long toId, int recordCount, String hash, String prevHash,
                           Instant createdAt) {

        static SealView of(AuditSeal s) {
            return new SealView(s.getId(), s.getFromId(), s.getToId(), s.getRecordCount(), s.getHash(),
                    s.getPrevHash(), s.getCreatedAt());
        }
    }

    /** One finding of the verification, with the plain-language meaning of its kind. */
    public record ProblemView(Long recordId, Long sealId, String problem, String message) {
    }

    /** Result of {@code GET /audit/verify}. */
    public record VerifyView(boolean intact, int sealsChecked, int recordsChecked, long unsealedRecords,
                             Long lastSealId, String lastSealHash, int problemCount, ProblemView firstProblem,
                             List<ProblemView> problems) {
    }

    private final AuditSealRepository seals;
    private final Clock clock;

    public AuditSealService(AuditSealRepository seals, Clock clock) {
        this.seals = seals;
        this.clock = clock;
    }

    /**
     * Seals the records not sealed yet, if there are any.
     *
     * @param settle true for the scheduled run (skip records younger than ten seconds), false for "seal now"
     * @return the new seal, or empty when there was nothing to seal
     */
    @Transactional
    public Optional<SealView> seal(boolean settle) {
        seals.lockForSealing();
        Instant now = clock.instant();
        Instant before = settle ? now.minusSeconds(SETTLE_SECONDS) : now.plusSeconds(1);
        Optional<AuditSeal> last = seals.latest();
        long afterId = last.map(AuditSeal::getToId).orElse(0L);
        String prevHash = last.map(AuditSeal::getHash).orElse(AuditSealing.GENESIS_HASH);

        List<AuditFacts> batch = seals.factsAfter(afterId, before, MAX_BATCH);
        if (batch.isEmpty()) {
            return Optional.empty();
        }
        List<String> digests = batch.stream().map(AuditSealing::digest).toList();
        long from = batch.get(0).id();
        long to = batch.get(batch.size() - 1).id();
        String hash = AuditSealing.sealHash(prevHash, from, to, batch.size(), digests);
        AuditSeal seal = seals.insert(new AuditSeal(from, to, batch.size(), hash, prevHash, now), batch, digests);
        log.info("AUDIT SEAL #{} covers records {}-{} ({} records) hash={}", seal.getId(), from, to, batch.size(), hash);
        return Optional.of(SealView.of(seal));
    }

    @Transactional(readOnly = true)
    public VerifyView verify() {
        List<AuditSeal> all = seals.all();
        AuditChainVerifier.Result result = AuditChainVerifier.verify(all, seal -> seals.entries(seal.getId()), seals::factsBetween);
        AuditSeal last = all.isEmpty() ? null : all.get(all.size() - 1);
        long unsealed = seals.countAfter(last == null ? 0 : last.getToId());
        List<ProblemView> problems = result.problems().stream().map(AuditSealService::view).toList();
        return new VerifyView(result.intact(), result.sealsChecked(), result.recordsChecked(), unsealed,
                last == null ? null : last.getId(), last == null ? null : last.getHash(), result.problemCount(),
                result.firstProblem() == null ? null : view(result.firstProblem()), problems);
    }

    private static ProblemView view(AuditChainVerifier.Problem p) {
        return new ProblemView(p.recordId(), p.sealId(), p.kind().name(), p.message());
    }
}
