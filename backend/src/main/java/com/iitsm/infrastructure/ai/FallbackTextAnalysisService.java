package com.iitsm.infrastructure.ai;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.intelligence.AnalysisContext;
import com.iitsm.domain.intelligence.AnalysisSource;
import com.iitsm.domain.intelligence.EmbeddingSimilarity;
import com.iitsm.domain.intelligence.CategorySuggestion;
import com.iitsm.domain.intelligence.CircuitBreaker;
import com.iitsm.domain.intelligence.IntakeSuggestion;
import com.iitsm.domain.intelligence.LlmClient;
import com.iitsm.domain.intelligence.SimilarMatch;
import com.iitsm.domain.intelligence.SimilarResult;
import com.iitsm.domain.intelligence.TextAnalysisService;
import com.iitsm.domain.intelligence.TextRecord;
import com.iitsm.domain.intelligence.ThreadInput;
import com.iitsm.domain.intelligence.ThreadSummary;

import io.micrometer.core.instrument.MeterRegistry;

/**
 * The service everything else uses (Strategy pattern with a safety net): {@code ai.primary} chooses LLM or KEYWORD
 * live. When the LLM is the primary, any exception, timeout (set by {@code ai.timeout.seconds}, default 8) or
 * malformed answer is logged as a warning and the keyword engine answers instead, so the caller always gets an
 * answer and its {@code source} says who produced it.
 * <p>
 * A {@link CircuitBreaker} stops a provider outage from costing a slow request every time: after
 * {@code ai.breaker.failures} consecutive failures the LLM is skipped for {@code ai.breaker.cooloff.seconds}; the
 * first request after the cool-off is the trial that closes the breaker (success) or re-opens it (failure).
 */
class FallbackTextAnalysisService implements TextAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(FallbackTextAnalysisService.class);

    private final TextAnalysisService llm;
    private final TextAnalysisService keyword;
    private final LlmClient client;
    private final ConfigService config;
    private final CircuitBreaker breaker;
    private final Clock clock;
    private final MeterRegistry metrics;

    FallbackTextAnalysisService(TextAnalysisService llm, TextAnalysisService keyword, LlmClient client,
                                ConfigService config, CircuitBreaker breaker, Clock clock, MeterRegistry metrics) {
        this.llm = llm;
        this.keyword = keyword;
        this.client = client;
        this.config = config;
        this.breaker = breaker;
        this.clock = clock;
        this.metrics = metrics;
    }

    @Override
    public CategorySuggestion suggestCategory(String title, String description, AnalysisContext context) {
        return attempt("suggestCategory", () -> llm.suggestCategory(title, description, context),
                () -> keyword.suggestCategory(title, description, context));
    }

    @Override
    public IntakeSuggestion suggestIntake(String description, AnalysisContext context) {
        return attempt("suggestIntake", () -> llm.suggestIntake(description, context),
                () -> keyword.suggestIntake(description, context));
    }

    @Override
    public List<SimilarMatch> findSimilar(String title, String description, List<TextRecord> candidates,
                                          List<String> corpus) {
        return keyword.findSimilar(title, description, candidates, corpus);
    }

    /**
     * Embeddings first when the query and every candidate have a vector (the application layer only supplies a query
     * vector when embeddings are enabled and healthy), else TF-IDF; either way the result names its engine.
     */
    @Override
    public SimilarResult findSimilarScored(String title, String description, double[] queryVector,
                                           List<TextRecord> candidates, List<String> corpus) {
        var ranked = EmbeddingSimilarity.rank(queryVector, candidates);
        if (ranked.isPresent()) {
            count("findSimilar", "embedding");
            return new SimilarResult(ranked.get(), AnalysisSource.EMBEDDING);
        }
        count("findSimilar", "keyword");
        return keyword.findSimilarScored(title, description, null, candidates, corpus);
    }

    @Override
    public ThreadSummary summarize(ThreadInput input) {
        return attempt("summarize", () -> llm.summarize(input), () -> keyword.summarize(input));
    }

    private <T> T attempt(String operation, Supplier<T> viaLlm, Supplier<T> viaKeyword) {
        AppSettings settings = config.current();
        if (!"LLM".equals(settings.raw(ConfigKey.AI_PRIMARY)) || !client.isAvailable()) {
            count(operation, "keyword");
            return viaKeyword.get();
        }
        Instant now = clock.instant();
        if (!breaker.allowRequest(now)) {
            count(operation, "keyword_breaker_open");
            return viaKeyword.get();
        }
        try {
            T result = viaLlm.get();
            breaker.recordSuccess();
            count(operation, "llm");
            return result;
        } catch (RuntimeException ex) {
            breaker.recordFailure(now, settings.intValue(ConfigKey.AI_BREAKER_FAILURES),
                    Duration.ofSeconds(settings.intValue(ConfigKey.AI_BREAKER_COOLOFF_SECONDS)));
            log.warn("LLM {} failed ({}), using the keyword engine; breaker {} after {} failure(s)", operation,
                    ex.getMessage(), breaker.state(now), breaker.consecutiveFailures());
            count(operation, "keyword_after_failure");
            return viaKeyword.get();
        }
    }

    /** Who answered, for Prometheus (A8): iitsm_ai_calls_total{operation, engine}. */
    private void count(String operation, String engine) {
        metrics.counter("iitsm.ai.calls", "operation", operation, "engine", engine).increment();
    }
}
