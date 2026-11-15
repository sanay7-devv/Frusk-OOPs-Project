package com.iitsm.application.intelligence;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Deque;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.iitsm.application.intelligence.EmbeddingClient.EmbeddingException;
import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.intelligence.CircuitBreaker;
import com.iitsm.domain.intelligence.TextRedactor;
import com.iitsm.domain.intelligence.TextRecord;
import com.iitsm.domain.repository.EmbeddingRepository;

import io.micrometer.core.instrument.MeterRegistry;

/**
 * Everything about incident embeddings (module M12, DEC-M12-10), built to stay inside a free API tier:
 * <ul>
 *   <li>an incident is embedded once, after it is created (the listener) or later by the backfill job, and the
 *       vector is stored with the model name, so nothing is embedded twice and a changed model is recomputed;</li>
 *   <li>a search embeds only the query text, once, and the answer is kept briefly so the incident created right
 *       after its duplicate check does not cost a second call;</li>
 *   <li>all callers share one cap of {@code embedding.rate.per.minute} texts per sliding minute; a call that would
 *       exceed it is skipped (the backfill catches up later);</li>
 *   <li>a failure, 429 or timeout opens a circuit breaker (same settings as the LLM one), and while it is open or
 *       there is no key nothing is called: similarity silently uses TF-IDF.</li>
 * </ul>
 * Text is redacted ({@link TextRedactor}) before it leaves the system. {@code ai.primary=KEYWORD} switches
 * embeddings off together with the LLM.
 */
@Service
public class EmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingService.class);
    private static final int MAX_TEXT_CHARS = 6000;
    private static final int QUERY_CACHE_SIZE = 200;
    private static final Duration QUERY_CACHE_TTL = Duration.ofMinutes(10);
    private static final Duration BACKFILL_TIMEOUT = Duration.ofSeconds(30);
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private record Cached(double[] vector, Instant expires) {
    }

    private final EmbeddingClient client;
    private final EmbeddingRepository repository;
    private final ConfigService config;
    private final Clock clock;
    private final MeterRegistry metrics;
    private final CircuitBreaker breaker = new CircuitBreaker();
    private final Deque<Instant> sent = new ArrayDeque<>();
    private final Map<String, Cached> recent = new LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Cached> eldest) {
            return size() > QUERY_CACHE_SIZE;
        }
    };

    EmbeddingService(EmbeddingClient client, EmbeddingRepository repository, ConfigService config, Clock clock,
                     MeterRegistry metrics) {
        this.client = client;
        this.repository = repository;
        this.config = config;
        this.clock = clock;
        this.metrics = metrics;
    }

    /** True when there is a key and the operator has not switched the AI engines to KEYWORD. */
    public boolean active() {
        return client.isAvailable() && !"KEYWORD".equals(config.current().raw(ConfigKey.AI_PRIMARY));
    }

    /** The name stored with each vector (model and size). */
    public String model() {
        return client.model();
    }

    /** Stored vectors of these incidents made by the current model; others are absent. */
    public Map<Long, double[]> vectors(Collection<Long> incidentIds) {
        return active() ? repository.findVectors(incidentIds, client.model()) : Map.of();
    }

    public Optional<double[]> vector(Long incidentId) {
        return active() ? repository.findVector(incidentId, client.model()) : Optional.empty();
    }

    // ------------------------------------------------------------------ one text

    /** The vector of a draft's text, or empty when embeddings are off, capped, failing or not answering in time. */
    public Optional<double[]> embedQuery(String title, String body) {
        if (!active()) {
            return Optional.empty();
        }
        return embedOne(textOf(title, body), "query");
    }

    /** After-commit hook for a new incident: embeds its text and stores the vector; replaces an older vector. */
    public void embedIncident(Long incidentId) {
        if (!active()) {
            return;
        }
        Optional<TextRecord> record = repository.findText(incidentId);
        if (record.isEmpty()) {
            return;
        }
        Optional<double[]> vector = embedOne(textOf(record.get().title(), record.get().body()), "create");
        vector.ifPresent(v -> repository.save(incidentId, v, client.model(), clock.instant()));
    }

    private Optional<double[]> embedOne(String text, String purpose) {
        AppSettings settings = config.current();
        Instant now = clock.instant();
        String key = cacheKey(text);
        synchronized (recent) {
            Cached cached = recent.get(key);
            if (cached != null && now.isBefore(cached.expires())) {
                count(purpose, "cache_hit");
                return Optional.of(cached.vector());
            }
        }
        if (!breaker.allowRequest(now)) {
            count(purpose, "breaker_open");
            return Optional.empty();
        }
        if (!acquire(1, settings.intValue(ConfigKey.EMBEDDING_RATE_PER_MINUTE), now)) {
            count(purpose, "capped");
            return Optional.empty();
        }
        try {
            double[] vector = client.embed(List.of(text), Duration.ofSeconds(settings.intValue(ConfigKey.AI_TIMEOUT_SECONDS)))
                    .get(0);
            breaker.recordSuccess();
            synchronized (recent) {
                recent.put(key, new Cached(vector, now.plus(QUERY_CACHE_TTL)));
            }
            count(purpose, "ok");
            return Optional.of(vector);
        } catch (EmbeddingException | IndexOutOfBoundsException ex) {
            failed(ex, now, settings);
            count(purpose, "failed");
            return Optional.empty();
        }
    }

    // ------------------------------------------------------------------ backfill

    /**
     * One run of the backfill job: embeds up to {@code embedding.backfill.batch} incidents that have no vector (or
     * one from another model), newest first, in a single batch call, never more than the per-minute cap allows.
     *
     * @return how many incidents got a vector
     */
    public int backfill() {
        if (!active()) {
            return 0;
        }
        AppSettings settings = config.current();
        Instant now = clock.instant();
        if (!breaker.allowRequest(now)) {
            count("backfill", "breaker_open");
            return 0;
        }
        int allowed = Math.min(settings.intValue(ConfigKey.EMBEDDING_BACKFILL_BATCH),
                available(settings.intValue(ConfigKey.EMBEDDING_RATE_PER_MINUTE), now));
        if (allowed <= 0) {
            count("backfill", "capped");
            return 0;
        }
        List<TextRecord> pending = repository.findPending(client.model(), allowed);
        if (pending.isEmpty()) {
            return 0;
        }
        acquire(pending.size(), Integer.MAX_VALUE, now);
        try {
            List<double[]> vectors = client.embed(
                    pending.stream().map(p -> textOf(p.title(), p.body())).toList(), BACKFILL_TIMEOUT);
            Instant saved = clock.instant();
            for (int i = 0; i < pending.size(); i++) {
                repository.save(pending.get(i).id(), vectors.get(i), client.model(), saved);
            }
            breaker.recordSuccess();
            count("backfill", "ok");
            return pending.size();
        } catch (EmbeddingException ex) {
            failed(ex, now, settings);
            count("backfill", "failed");
            return 0;
        }
    }

    /** Vectors stored by the current model and incidents in total, for the demo and for monitoring. */
    public long embeddedCount() {
        return repository.countEmbedded(client.model());
    }

    public long incidentCount() {
        return repository.countIncidents();
    }

    // ------------------------------------------------------------------ helpers

    /** What is sent to the model: title and description with emails, addresses and secrets removed. */
    static String textOf(String title, String body) {
        String text = TextRedactor.redact(title) + "\n\n" + TextRedactor.redact(body);
        return text.length() > MAX_TEXT_CHARS ? text.substring(0, MAX_TEXT_CHARS) : text;
    }

    private void failed(RuntimeException ex, Instant now, AppSettings settings) {
        int limit = ex instanceof EmbeddingException e && e.rateLimited() ? 1
                : settings.intValue(ConfigKey.AI_BREAKER_FAILURES);
        breaker.recordFailure(now, limit, Duration.ofSeconds(settings.intValue(ConfigKey.AI_BREAKER_COOLOFF_SECONDS)));
        log.warn("Embedding call failed ({}), TF-IDF is used; breaker {} after {} failure(s)", ex.getMessage(),
                breaker.state(now), breaker.consecutiveFailures());
    }

    /** Counts {@code n} texts against the sliding-minute cap; false (and nothing counted) if they do not fit. */
    private synchronized boolean acquire(int n, int perMinute, Instant now) {
        trim(now);
        if (sent.size() + n > perMinute) {
            return false;
        }
        for (int i = 0; i < n; i++) {
            sent.addLast(now);
        }
        return true;
    }

    private synchronized int available(int perMinute, Instant now) {
        trim(now);
        return Math.max(0, perMinute - sent.size());
    }

    private void trim(Instant now) {
        while (!sent.isEmpty() && !sent.peekFirst().isAfter(now.minus(WINDOW))) {
            sent.removeFirst();
        }
    }

    private static String cacheKey(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    /** Who was called and how it went, for Prometheus (A8): iitsm_embedding_calls_total{purpose, outcome}. */
    private void count(String purpose, String outcome) {
        metrics.counter("iitsm.embedding.calls", "purpose", purpose, "outcome", outcome).increment();
    }
}
