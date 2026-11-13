package com.iitsm.application.intelligence;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.intelligence.IntelligenceReader.ResolutionInputs;
import com.iitsm.application.intelligence.IntelligenceReader.SimilarInputs;
import com.iitsm.application.intelligence.IntelligenceViews.CategorySuggestionView;
import com.iitsm.application.intelligence.IntelligenceViews.IntakeSuggestionView;
import com.iitsm.application.intelligence.IntelligenceViews.MatchKind;
import com.iitsm.application.intelligence.IntelligenceViews.SimilarIncidentView;
import com.iitsm.application.intelligence.IntelligenceViews.SuggestedResolutionView;
import com.iitsm.application.intelligence.IntelligenceViews.ThreadSummaryView;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.intelligence.AnalysisContext;
import com.iitsm.domain.intelligence.CategorySuggestion;
import com.iitsm.domain.intelligence.IntakeSuggestion;
import com.iitsm.domain.intelligence.SimilarMatch;
import com.iitsm.domain.intelligence.TextAnalysisService;
import com.iitsm.domain.intelligence.ThreadInput;
import com.iitsm.domain.intelligence.ThreadSummary;

/**
 * Use cases of module M12 (API contract B.4 intelligence, C.6): category and intake suggestions, similar incidents,
 * suggested resolutions and the thread summary. It loads data through {@link IntelligenceReader} (short read-only
 * transactions), then runs the engine with no database connection held, because an LLM call can take seconds.
 * <p>
 * Rules applied here, whichever engine answers: a category is shown only at {@code autocat.min.confidence} or more
 * (the user can always override); the suggestion endpoints are rate-limited per user and briefly cached; similar
 * incidents are scored with the TF-IDF thresholds, not the embedding ones (DEC-42).
 * <p>
 * {@link #similarTo} and the threshold helper are the entry point the later duplicate check on creation,
 * mark-duplicate, problem-record grouping and Major Incident Mode will call.
 */
@Service
public class IntelligenceService {

    private static final int MAX_SIMILAR = 5;
    private static final int MAX_RESOLUTIONS = 5;
    /** Ordering bonus for a fix its author marked reusable; the similarity shown is never inflated. */
    private static final double REUSABLE_BONUS = 0.10;

    private final IntelligenceReader reader;
    private final TextAnalysisService analysis;
    private final ConfigService config;
    private final AiResultCache cache;
    private final AiRateLimiter limiter;

    IntelligenceService(IntelligenceReader reader, TextAnalysisService analysis, ConfigService config,
                        AiResultCache cache, AiRateLimiter limiter) {
        this.reader = reader;
        this.analysis = analysis;
        this.config = config;
        this.cache = cache;
        this.limiter = limiter;
    }

    // ------------------------------------------------------------------ suggestions for a draft

    public CategorySuggestionView suggestCategory(AuthenticatedUser caller, String title, String description,
                                                  Long serviceId) {
        AppSettings settings = config.current();
        limiter.check(caller.id(), settings.intValue(ConfigKey.AI_RATE_LIMIT_PER_MINUTE));
        if (serviceId != null) {
            reader.requireService(serviceId);
        }
        String key = AiResultCache.key("category", settings.raw(ConfigKey.AI_PRIMARY), title, description);
        CategorySuggestionView cached = cache.get(key);
        if (cached != null) {
            return cached;
        }
        AnalysisContext context = reader.context();
        CategorySuggestion suggestion = analysis.suggestCategory(title, description, context);
        double minimum = settings.decimalValue(ConfigKey.AUTOCAT_MIN_CONFIDENCE).doubleValue();
        boolean shown = suggestion.categoryId() != null && suggestion.confidence() >= minimum;
        CategorySuggestionView view = shown
                ? new CategorySuggestionView(suggestion.categoryId(), suggestion.categoryName(),
                        suggestion.confidence(), suggestion.reason(), suggestion.source())
                : new CategorySuggestionView(null, null, suggestion.confidence(), "", suggestion.source());
        cache.put(key, view, settings.intValue(ConfigKey.AI_CACHE_TTL_SECONDS));
        return view;
    }

    public IntakeSuggestionView suggestIntake(AuthenticatedUser caller, String description) {
        AppSettings settings = config.current();
        limiter.check(caller.id(), settings.intValue(ConfigKey.AI_RATE_LIMIT_PER_MINUTE));
        String key = AiResultCache.key("intake", settings.raw(ConfigKey.AI_PRIMARY), description);
        IntakeSuggestionView cached = cache.get(key);
        if (cached != null) {
            return cached;
        }
        IntakeSuggestion suggestion = analysis.suggestIntake(description, reader.context());
        double minimum = settings.decimalValue(ConfigKey.AUTOCAT_MIN_CONFIDENCE).doubleValue();
        boolean shown = suggestion.confidence() >= minimum;
        IntakeSuggestionView view = new IntakeSuggestionView(shown ? suggestion.categoryId() : null,
                shown ? suggestion.categoryName() : null, suggestion.impact(), suggestion.urgency(),
                suggestion.confidence(), shown ? suggestion.reason() : "", suggestion.source());
        cache.put(key, view, settings.intValue(ConfigKey.AI_CACHE_TTL_SECONDS));
        return view;
    }

    /** POST /intelligence/similar: open incidents on the same service inside the look-back window. */
    public List<SimilarIncidentView> similarToDraft(AuthenticatedUser caller, Long serviceId, String title,
                                                    String description) {
        limiter.check(caller.id(), config.current().intValue(ConfigKey.AI_RATE_LIMIT_PER_MINUTE));
        return similarTo(reader.similarToDraft(serviceId, title, description));
    }

    // ------------------------------------------------------------------ per incident

    /** GET /incidents/{id}/similar: the same list for an existing incident (participants only). */
    public List<SimilarIncidentView> similarToIncident(AuthenticatedUser caller, Long id) {
        return similarTo(reader.similarToIncident(caller, id));
    }

    /**
     * Scores the candidates and keeps those at or above the related threshold, best first. A score at or above the
     * duplicate threshold is a likely duplicate, below it only related. Reused later by the duplicate check.
     */
    List<SimilarIncidentView> similarTo(SimilarInputs inputs) {
        double duplicate = inputs.settings().decimalValue(ConfigKey.DUP_TFIDF_THRESHOLD_DUPLICATE).doubleValue();
        double related = inputs.settings().decimalValue(ConfigKey.DUP_TFIDF_THRESHOLD_RELATED).doubleValue();
        return analysis.findSimilar(inputs.title(), inputs.body(), inputs.candidates(), inputs.corpus()).stream()
                .filter(match -> match.similarity() >= related)
                .limit(MAX_SIMILAR)
                .map(match -> {
                    IntelligenceReader.Ref ref = inputs.refs().get(match.id());
                    return new SimilarIncidentView(match.id(), ref.code(), ref.title(), round(match.similarity()),
                            ref.status(), match.similarity() >= duplicate ? MatchKind.DUPLICATE : MatchKind.RELATED);
                })
                .toList();
    }

    /** GET /incidents/{id}/suggested-resolutions: fixes of similar resolved incidents, reusable ones preferred. */
    public List<SuggestedResolutionView> suggestedResolutions(AuthenticatedUser caller, Long id) {
        ResolutionInputs inputs = reader.resolutionsFor(caller, id);
        double minimum = inputs.settings().decimalValue(ConfigKey.RESOLUTION_MIN_SIMILARITY).doubleValue();
        List<SimilarMatch> matches = analysis.findSimilar(inputs.title(), inputs.body(), inputs.candidates(),
                inputs.corpus()).stream().filter(m -> m.similarity() >= minimum).toList();
        return matches.stream()
                .sorted(Comparator.comparingDouble((SimilarMatch m) -> rank(m, inputs)).reversed())
                .limit(MAX_RESOLUTIONS)
                .map(match -> {
                    IntelligenceReader.ResolvedInfo info = inputs.infos().get(match.id());
                    return new SuggestedResolutionView(match.id(), info.code(), info.title(), round(match.similarity()),
                            info.rootCause(), info.notes(), info.steps(), info.reusable());
                })
                .toList();
    }

    private static double rank(SimilarMatch match, ResolutionInputs inputs) {
        return match.similarity() + (inputs.infos().get(match.id()).reusable() ? REUSABLE_BONUS : 0);
    }

    /** POST /incidents/{id}/summary: summary and handover notes of the comments and audit entries. */
    public ThreadSummaryView summary(AuthenticatedUser caller, Long id) {
        AppSettings settings = config.current();
        ThreadInput input = reader.threadFor(caller, id);
        limiter.check(caller.id(), settings.intValue(ConfigKey.AI_RATE_LIMIT_PER_MINUTE));
        String key = AiResultCache.key("summary", settings.raw(ConfigKey.AI_PRIMARY), String.valueOf(id),
                input.toString());
        ThreadSummaryView cached = cache.get(key);
        if (cached != null) {
            return cached;
        }
        ThreadSummary summary = analysis.summarize(input);
        ThreadSummaryView view = new ThreadSummaryView(summary.summary(), summary.handoverNotes(), summary.source());
        cache.put(key, view, settings.intValue(ConfigKey.AI_CACHE_TTL_SECONDS));
        return view;
    }

    private static double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, java.math.RoundingMode.HALF_UP).doubleValue();
    }
}
