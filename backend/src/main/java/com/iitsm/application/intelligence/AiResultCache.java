package com.iitsm.application.intelligence;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * A brief cache for suggestion answers (handbook 2.5 M12): the same input within {@code ai.cache.ttl.seconds}
 * gets the same answer, so a user typing and pausing does not repeat paid model calls. In memory and per
 * instance, like the config cache (DEC-18); a TTL of 0 switches it off. Keys are hashes, so text is not kept twice.
 */
@Component
class AiResultCache {

    private static final int PRUNE_ABOVE = 1000;

    private record Entry(Object value, Instant expires) {
    }

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final Clock clock;

    AiResultCache(Clock clock) {
        this.clock = clock;
    }

    @SuppressWarnings("unchecked")
    <T> T get(String key) {
        Entry entry = entries.get(key);
        if (entry == null) {
            return null;
        }
        if (!clock.instant().isBefore(entry.expires())) {
            entries.remove(key);
            return null;
        }
        return (T) entry.value();
    }

    void put(String key, Object value, int ttlSeconds) {
        if (ttlSeconds <= 0) {
            return;
        }
        Instant now = clock.instant();
        if (entries.size() > PRUNE_ABOVE) {
            entries.values().removeIf(entry -> !now.isBefore(entry.expires()));
        }
        entries.put(key, new Entry(value, now.plusSeconds(ttlSeconds)));
    }

    /** A stable key for an operation and its inputs. */
    static String key(String operation, String... parts) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            for (String part : parts) {
                digest.update((part == null ? "" : part).getBytes(StandardCharsets.UTF_8));
                digest.update((byte) 0);
            }
            return operation + ":" + HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
