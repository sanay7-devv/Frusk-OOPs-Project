package com.iitsm.domain.audit;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.Function;

/**
 * Recomputes the seal chain and names what no longer matches (S3, DEC-44, DEC-91). Pure domain code: the caller
 * supplies the seals and two lookups, so the rules can be tested without a database.
 * <p>
 * For each seal, in order: the chain link (its stored previous hash must equal the previous seal's hash), the entry
 * count, the seal hash recomputed from its stored digests; then for each record in its range: present, same digest,
 * and no record in the range that the seal does not know. Problems are collected in the order found; the first one
 * names the first altered record or seal.
 */
public final class AuditChainVerifier {

    /** What kind of change was found. */
    public enum Kind {
        RECORD_CHANGED("the record's content differs from what was sealed"),
        RECORD_MISSING("the record was sealed but is no longer in the audit trail"),
        RECORD_INSERTED("a record sits inside a sealed range but was not part of the seal"),
        SEAL_ENTRIES_MISSING("seal entries were removed or added"),
        SEAL_ALTERED("the seal hash does not match its own entries"),
        SEAL_CHAIN_BROKEN("the seal does not continue from the previous seal");

        private final String meaning;

        Kind(String meaning) {
            this.meaning = meaning;
        }

        public String meaning() {
            return meaning;
        }
    }

    /** One finding; {@code recordId} is null for problems of a whole seal. */
    public record Problem(Long recordId, Long sealId, Kind kind, String message) {
    }

    /** The outcome: {@code firstProblem} is null exactly when {@code intact}. */
    public record Result(boolean intact, int sealsChecked, int recordsChecked, int problemCount, Problem firstProblem,
                         List<Problem> problems) {
    }

    /** Most problems listed in the result (the count is always complete). */
    private static final int MAX_LISTED = 20;

    private AuditChainVerifier() {
    }

    public static Result verify(List<AuditSeal> seals, Function<AuditSeal, List<AuditSealEntry>> entriesOf,
                                BiFunction<Long, Long, List<AuditFacts>> recordsBetween) {
        List<Problem> problems = new ArrayList<>();
        int problemCount = 0;
        int recordsChecked = 0;
        String expectedPrev = AuditSealing.GENESIS_HASH;

        for (AuditSeal seal : seals) {
            List<Problem> found = new ArrayList<>();
            if (!seal.getPrevHash().equals(expectedPrev)) {
                found.add(new Problem(null, seal.getId(), Kind.SEAL_CHAIN_BROKEN,
                        "Seal " + seal.getId() + " does not continue from the seal before it."));
            }
            List<AuditSealEntry> entries = entriesOf.apply(seal);
            if (entries.size() != seal.getRecordCount()) {
                found.add(new Problem(null, seal.getId(), Kind.SEAL_ENTRIES_MISSING, "Seal " + seal.getId()
                        + " covers " + seal.getRecordCount() + " records but has " + entries.size() + " entries."));
            }
            String recomputed = AuditSealing.sealHash(seal.getPrevHash(), seal.getFromId(), seal.getToId(),
                    seal.getRecordCount(), entries.stream().map(AuditSealEntry::getDigest).toList());
            if (!recomputed.equals(seal.getHash())) {
                found.add(new Problem(null, seal.getId(), Kind.SEAL_ALTERED,
                        "Seal " + seal.getId() + " does not match its own entries."));
            }

            Map<Long, AuditFacts> current = new HashMap<>();
            recordsBetween.apply(seal.getFromId(), seal.getToId()).forEach(f -> current.put(f.id(), f));
            recordsChecked += entries.size();
            Map<Long, String> sealed = new HashMap<>();
            for (AuditSealEntry entry : entries) {
                sealed.put(entry.getRecordId(), entry.getDigest());
            }
            List<Long> ids = new ArrayList<>(sealed.keySet());
            ids.addAll(current.keySet().stream().filter(id -> !sealed.containsKey(id)).toList());
            ids.sort(Long::compare);
            for (Long id : ids) {
                AuditFacts facts = current.get(id);
                if (!sealed.containsKey(id)) {
                    found.add(new Problem(id, seal.getId(), Kind.RECORD_INSERTED,
                            "Record " + id + " lies inside seal " + seal.getId() + " but was never sealed."));
                } else if (facts == null) {
                    found.add(new Problem(id, seal.getId(), Kind.RECORD_MISSING,
                            "Record " + id + " was deleted (sealed in seal " + seal.getId() + ")."));
                } else if (!AuditSealing.digest(facts).equals(sealed.get(id))) {
                    found.add(new Problem(id, seal.getId(), Kind.RECORD_CHANGED,
                            "Record " + id + " was changed after it was sealed (seal " + seal.getId() + ")."));
                }
            }
            problemCount += found.size();
            for (Problem p : found) {
                if (problems.size() < MAX_LISTED) {
                    problems.add(p);
                }
            }
            expectedPrev = seal.getHash();
        }
        return new Result(problemCount == 0, seals.size(), recordsChecked, problemCount,
                problems.isEmpty() ? null : problems.get(0), List.copyOf(problems));
    }
}
