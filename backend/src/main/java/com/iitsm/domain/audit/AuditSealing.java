package com.iitsm.domain.audit;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;

/**
 * The two hash rules of the sealed audit trail (S3, DEC-44, DEC-91), kept in one place so sealing and verifying can
 * never disagree:
 * <ul>
 *   <li><b>record digest</b> = SHA-256 of {@code id|createdAt|actorId|action|incidentId|previous|new|description}
 *       (time cut to microseconds, the precision PostgreSQL keeps; {@code -} for a null column; the description comes
 *       last, so a "|" inside it cannot be mistaken for a separator);</li>
 *   <li><b>seal hash</b> = SHA-256 of {@code prevHash|fromId|toId|count|digest1,digest2,...} in record-id order, so
 *       each seal is chained to the one before it: changing any record, any digest or any earlier seal changes every
 *       seal hash after it.</li>
 * </ul>
 */
public final class AuditSealing {

    /** "Previous hash" of the very first seal. */
    public static final String GENESIS_HASH = "0".repeat(64);

    private AuditSealing() {
    }

    public static String digest(AuditFacts f) {
        String line = f.id() + "|" + f.createdAt().truncatedTo(ChronoUnit.MICROS) + "|" + orDash(f.actorId()) + "|"
                + f.action() + "|" + orDash(f.incidentId()) + "|" + orDash(f.previousState()) + "|"
                + orDash(f.newState()) + "|" + f.description();
        return sha256(line);
    }

    public static String sealHash(String prevHash, long fromId, long toId, int count, List<String> digests) {
        return sha256(prevHash + "|" + fromId + "|" + toId + "|" + count + "|" + String.join(",", digests));
    }

    private static String orDash(Object value) {
        return value == null ? "-" : value.toString();
    }

    private static String sha256(String text) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is always available in the JDK", ex);
        }
    }
}
