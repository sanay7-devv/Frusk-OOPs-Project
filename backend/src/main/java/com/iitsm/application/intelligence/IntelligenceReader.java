package com.iitsm.application.intelligence;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.auth.AuthenticatedUser;
import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentAccessPolicy;
import com.iitsm.domain.audit.AuditAction;
import com.iitsm.domain.audit.AuditRecord;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.IncidentNotFoundException;
import com.iitsm.domain.exception.ServiceNotFoundException;
import com.iitsm.domain.exception.UnauthorizedOperationException;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentComment;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.intelligence.AnalysisContext;
import com.iitsm.domain.intelligence.CategoryOption;
import com.iitsm.domain.intelligence.LabelledText;
import com.iitsm.domain.intelligence.TextRecord;
import com.iitsm.domain.intelligence.ThreadEntry;
import com.iitsm.domain.intelligence.ThreadInput;
import com.iitsm.domain.repository.AuditRepository;
import com.iitsm.domain.repository.CategoryRepository;
import com.iitsm.domain.repository.IncidentCommentRepository;
import com.iitsm.domain.repository.IncidentRepository;
import com.iitsm.domain.repository.IncidentTextRepository;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.user.PermissionKey;

/**
 * Loads everything the intelligence engines need, inside short read-only transactions, and hands back plain records.
 * The engines (and the LLM call, which can take seconds) then run with no database connection held. Also the one
 * place that enforces who may read what: a caller who may not see an incident gets 404 INCIDENT_NOT_FOUND (DEC-21);
 * a caller who may see it but is not its assignee, a team lead or an admin gets 403 on the staff-only endpoints.
 */
@Service
class IntelligenceReader {

    /** Structural limits of the queries (how much history is read), not business thresholds. */
    static final int RESOLVED_LOOKBACK_DAYS = 365;
    private static final int RESOLVED_LIMIT = 500;
    private static final int HISTORY_LIMIT = 1000;
    private static final int CORPUS_LIMIT = 2000;
    private static final Duration CORPUS_CACHE = Duration.ofSeconds(60);

    /** What the response needs to show about a similar incident. */
    record Ref(String code, String title, IncidentStatus status) {
    }

    /** {@code queryVector} is the stored embedding of an existing incident, null for a draft or when absent. */
    record SimilarInputs(String title, String body, List<TextRecord> candidates, Map<Long, Ref> refs,
                         List<String> corpus, AppSettings settings, double[] queryVector) {
    }

    record ResolvedInfo(String code, String title, String rootCause, String notes, String steps, boolean reusable) {
    }

    record ResolutionInputs(String title, String body, List<TextRecord> candidates, Map<Long, ResolvedInfo> infos,
                            List<String> corpus, AppSettings settings) {
    }

    private record CachedCorpus(List<String> texts, int windowDays, Instant expires) {
    }

    private final CategoryRepository categories;
    private final IncidentTextRepository texts;
    private final IncidentRepository incidents;
    private final ItServiceRepository services;
    private final IncidentCommentRepository comments;
    private final AuditRepository audit;
    private final IncidentAccessPolicy access;
    private final ConfigService config;
    private final Clock clock;
    private final EmbeddingService embeddings;
    private volatile CachedCorpus corpusCache;

    IntelligenceReader(CategoryRepository categories, IncidentTextRepository texts, IncidentRepository incidents,
                       ItServiceRepository services, IncidentCommentRepository comments, AuditRepository audit,
                       IncidentAccessPolicy access, ConfigService config, Clock clock,
                       EmbeddingService embeddings) {
        this.categories = categories;
        this.texts = texts;
        this.incidents = incidents;
        this.services = services;
        this.comments = comments;
        this.audit = audit;
        this.access = access;
        this.config = config;
        this.clock = clock;
        this.embeddings = embeddings;
    }

    // ------------------------------------------------------------------ draft text

    @Transactional(readOnly = true)
    public void requireService(Long serviceId) {
        services.findById(serviceId).orElseThrow(() -> new ServiceNotFoundException(serviceId));
    }

    /** Active categories, categorised history and the corpus: what category and intake suggestions need. */
    @Transactional(readOnly = true)
    public AnalysisContext context() {
        AppSettings settings = config.current();
        Instant since = clock.instant().minus(Duration.ofDays(settings.intValue(ConfigKey.AI_IDF_WINDOW_DAYS)));
        List<CategoryOption> options = categories.findByActiveTrueOrderByNameAsc().stream()
                .map(c -> new CategoryOption(c.getId(), c.getName())).toList();
        Set<Long> active = options.stream().map(CategoryOption::id).collect(Collectors.toSet());
        List<LabelledText> history = texts.findCategorisedTexts(since, HISTORY_LIMIT).stream()
                .filter(h -> active.contains(h.categoryId())).toList();
        return new AnalysisContext(options, history, corpus());
    }

    /** Recent incident texts that give TF-IDF its word-rarity weights; cached for a minute. */
    @Transactional(readOnly = true)
    public List<String> corpus() {
        int windowDays = config.current().intValue(ConfigKey.AI_IDF_WINDOW_DAYS);
        Instant now = clock.instant();
        CachedCorpus cached = corpusCache;
        if (cached != null && cached.windowDays() == windowDays && now.isBefore(cached.expires())) {
            return cached.texts();
        }
        List<String> loaded = texts.findRecentTexts(now.minus(Duration.ofDays(windowDays)), CORPUS_LIMIT);
        corpusCache = new CachedCorpus(loaded, windowDays, now.plus(CORPUS_CACHE));
        return loaded;
    }

    // ------------------------------------------------------------------ similarity

    @Transactional(readOnly = true)
    public SimilarInputs similarToDraft(Long serviceId, String title, String body) {
        requireService(serviceId);
        AppSettings settings = config.current();
        Instant now = clock.instant();
        Duration window = Duration.ofHours(settings.intValue(ConfigKey.DUP_WINDOW_HOURS));
        return similarInputs(title, body, texts.findOpenOnService(serviceId, now.minus(window), now, null), settings,
                null);
    }

    /** Open incidents on the same service created within the look-back window of this incident, either side. */
    @Transactional(readOnly = true)
    public SimilarInputs similarToIncident(AuthenticatedUser caller, Long id) {
        Incident incident = loadVisible(caller, id);
        AppSettings settings = config.current();
        Duration window = Duration.ofHours(settings.intValue(ConfigKey.DUP_WINDOW_HOURS));
        List<Incident> found = texts.findOpenOnService(incident.getService().getId(),
                incident.getCreatedAt().minus(window), incident.getCreatedAt().plus(window), incident.getId());
        return similarInputs(incident.getTitle(), incident.getDescription(), found, settings,
                embeddings.vector(incident.getId()).orElse(null));
    }

    private SimilarInputs similarInputs(String title, String body, List<Incident> found, AppSettings settings,
                                        double[] queryVector) {
        List<TextRecord> candidates = new ArrayList<>();
        Map<Long, Ref> refs = new HashMap<>();
        Map<Long, double[]> vectors = embeddings.vectors(found.stream().map(Incident::getId).toList());
        for (Incident other : found) {
            candidates.add(new TextRecord(other.getId(), other.getTitle(), other.getDescription(),
                    vectors.get(other.getId())));
            refs.put(other.getId(), new Ref(other.getCode(), other.getTitle(), other.getStatus()));
        }
        return new SimilarInputs(title, body, candidates, refs, corpus(), settings, queryVector);
    }

    // ------------------------------------------------------------------ staff-only reads

    @Transactional(readOnly = true)
    public ResolutionInputs resolutionsFor(AuthenticatedUser caller, Long id) {
        Incident incident = loadStaff(caller, id);
        AppSettings settings = config.current();
        Instant since = clock.instant().minus(Duration.ofDays(RESOLVED_LOOKBACK_DAYS));
        List<TextRecord> candidates = new ArrayList<>();
        Map<Long, ResolvedInfo> infos = new HashMap<>();
        for (Incident past : texts.findResolved(null, since, RESOLVED_LIMIT)) {
            if (past.getId().equals(incident.getId())) {
                continue;
            }
            candidates.add(new TextRecord(past.getId(), past.getTitle(),
                    past.getDescription() + " " + past.getResolution().getRootCause()));
            infos.put(past.getId(), new ResolvedInfo(past.getCode(), past.getTitle(),
                    past.getResolution().getRootCause(), past.getResolution().getNotes(),
                    past.getResolution().getSteps(), past.getResolution().isReusable()));
        }
        return new ResolutionInputs(incident.getTitle(), incident.getDescription(), candidates, infos, corpus(),
                settings);
    }

    /** The incident's comments and audit entries, oldest first, for the summariser. */
    @Transactional(readOnly = true)
    public ThreadInput threadFor(AuthenticatedUser caller, Long id) {
        Incident incident = loadStaff(caller, id);
        List<ThreadEntry> entries = new ArrayList<>();
        for (IncidentComment comment : comments.findByIncident_IdOrderByCreatedAtAsc(incident.getId())) {
            entries.add(new ThreadEntry(ThreadEntry.Kind.COMMENT, comment.getCreatedAt(),
                    comment.getAuthor().getName(), comment.getBody(),
                    comment.getVisibility() == com.iitsm.domain.incident.CommentVisibility.INTERNAL));
        }
        for (AuditRecord record : audit.findByIncident(incident.getId())) {
            if (record.getAction() == AuditAction.COMMENT_ADDED) {
                continue; // the comment itself is already in the list
            }
            entries.add(new ThreadEntry(ThreadEntry.Kind.AUDIT, record.getCreatedAt(),
                    record.getActor() == null ? "system" : record.getActor().getName(), record.getDescription(),
                    record.isInternal()));
        }
        entries.sort(java.util.Comparator.comparing(ThreadEntry::at));
        return new ThreadInput(incident.getCode(), incident.getTitle(), incident.getDescription(),
                incident.getStatus().name(), incident.getPriority() == null ? null : incident.getPriority().name(),
                incident.getAssignee() == null ? null : incident.getAssignee().getName(),
                incident.getSla().getResolutionDue(),
                // Hibernate leaves an embedded value null when all its columns are empty (not resolved yet)
                incident.getResolution() != null && incident.getResolution().isPresent()
                        ? incident.getResolution().getNotes() : null, entries);
    }

    // ------------------------------------------------------------------ access

    /** The incident, or 404 if the caller may not see it (existence is not revealed, DEC-21). */
    Incident loadVisible(AuthenticatedUser caller, Long id) {
        Incident incident = incidents.findById(id).orElseThrow(() -> new IncidentNotFoundException(id));
        if (!access.canView(caller, incident)) {
            throw new IncidentNotFoundException(id);
        }
        return incident;
    }

    /** Assignee, team lead or admin (API contract C.6); another viewer, such as the reporter, gets 403. */
    Incident loadStaff(AuthenticatedUser caller, Long id) {
        Incident incident = loadVisible(caller, id);
        requireStaff(caller, incident);
        return incident;
    }

    void requireStaff(AuthenticatedUser caller, Incident incident) {
        boolean staff = incident.isAssignedTo(caller.id()) || caller.can(PermissionKey.INCIDENT_VIEW_ALL)
                || caller.can(PermissionKey.INCIDENT_VIEW_TEAM);
        if (!staff) {
            throw new UnauthorizedOperationException(
                    "Only the assignee, a team lead or an administrator may use this on " + incident.getCode() + ".");
        }
    }
}
