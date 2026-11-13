package com.iitsm.infrastructure.ai;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.intelligence.AnalysisContext;
import com.iitsm.domain.intelligence.AnalysisSource;
import com.iitsm.domain.intelligence.CategoryOption;
import com.iitsm.domain.intelligence.CategorySuggestion;
import com.iitsm.domain.intelligence.IntakeSuggestion;
import com.iitsm.domain.intelligence.LlmClient;
import com.iitsm.domain.intelligence.SimilarMatch;
import com.iitsm.domain.intelligence.TextAnalysisService;
import com.iitsm.domain.intelligence.TextRecord;
import com.iitsm.domain.intelligence.TextRedactor;
import com.iitsm.domain.intelligence.ThreadEntry;
import com.iitsm.domain.intelligence.ThreadInput;
import com.iitsm.domain.intelligence.ThreadSummary;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * The LLM engine (Adapter pattern: it adapts the {@link LlmClient} port to {@link TextAnalysisService}).
 * <p>
 * Safety rules, each testable:
 * <ul>
 *   <li>only the title, the description, the category names and (for summaries) comment and audit text are sent,
 *       all passed through {@link TextRedactor} first; no names, emails or ids of people (DEC-42);</li>
 *   <li>incident text is untrusted: it travels as quoted JSON values and the prompts say to treat it as data;</li>
 *   <li>the answer must be strict JSON in the exact shape asked for; anything else, a category id that is not in
 *       the active list, or a number out of range is a failure, and the fallback wrapper then uses the keyword
 *       engine.</li>
 * </ul>
 * Similarity is not delegated to a model: the default is TF-IDF (DEC-42), so this class forwards it.
 */
class LlmTextAnalysisService implements TextAnalysisService {

    /** The model's answer broke the contract (not JSON, wrong field, unknown category, out of range). */
    static class InvalidLlmResponseException extends LlmClient.LlmException {

        InvalidLlmResponseException(String message) {
            super("invalid model response: " + message);
        }
    }

    private static final int MAX_REASON = 300;
    private static final int MAX_SUMMARY = 2000;
    private static final int MAX_NOTES = 10;
    private static final int MAX_NOTE = 500;

    private final LlmClient client;
    private final PromptLibrary prompts;
    private final TextAnalysisService keyword;
    private final ObjectMapper mapper;
    private final ConfigService config;

    LlmTextAnalysisService(LlmClient client, PromptLibrary prompts, TextAnalysisService keyword, ObjectMapper mapper,
                           ConfigService config) {
        this.client = client;
        this.prompts = prompts;
        this.keyword = keyword;
        this.mapper = mapper;
        this.config = config;
    }

    @Override
    public CategorySuggestion suggestCategory(String title, String description, AnalysisContext context) {
        ObjectNode payload = mapper.createObjectNode();
        payload.put("title", TextRedactor.redact(title));
        payload.put("description", TextRedactor.redact(description));
        categories(payload, context);
        JsonNode answer = ask("suggest-category", payload);
        CategoryOption category = category(answer, context);
        double confidence = confidence(answer);
        String reason = reason(answer);
        if (category == null) {
            return new CategorySuggestion(null, null, confidence, reason, AnalysisSource.LLM);
        }
        return new CategorySuggestion(category.id(), category.name(), confidence, reason, AnalysisSource.LLM);
    }

    @Override
    public IntakeSuggestion suggestIntake(String description, AnalysisContext context) {
        ObjectNode payload = mapper.createObjectNode();
        payload.put("description", TextRedactor.redact(description));
        categories(payload, context);
        JsonNode answer = ask("suggest-intake", payload);
        CategoryOption category = category(answer, context);
        return new IntakeSuggestion(category == null ? null : category.id(), category == null ? null : category.name(),
                level(answer, "impact"), level(answer, "urgency"), confidence(answer), reason(answer),
                AnalysisSource.LLM);
    }

    @Override
    public List<SimilarMatch> findSimilar(String title, String description, List<TextRecord> candidates,
                                          List<String> corpus) {
        return keyword.findSimilar(title, description, candidates, corpus);
    }

    @Override
    public ThreadSummary summarize(ThreadInput input) {
        ObjectNode payload = mapper.createObjectNode();
        payload.put("code", input.code());
        payload.put("title", TextRedactor.redact(input.title()));
        payload.put("status", input.status());
        payload.put("priority", input.priority() == null ? "" : input.priority());
        payload.put("description", TextRedactor.redact(input.description()));
        ArrayNode entries = payload.putArray("entries");
        for (ThreadEntry entry : input.entries()) {
            ObjectNode node = entries.addObject();
            node.put("kind", entry.kind().name());
            node.put("at", entry.at().toString());
            node.put("internal", entry.internal());
            node.put("text", TextRedactor.redact(entry.text()));
        }
        JsonNode answer = ask("summarize-thread", payload);
        String summary = text(answer, "summary", MAX_SUMMARY);
        JsonNode notes = answer.path("handoverNotes");
        if (!notes.isArray() || notes.size() > MAX_NOTES) {
            throw new InvalidLlmResponseException("handoverNotes must be a list of at most " + MAX_NOTES);
        }
        List<String> handover = new ArrayList<>();
        for (JsonNode note : notes) {
            if (!note.isString() || note.asText().length() > MAX_NOTE) {
                throw new InvalidLlmResponseException("a handover note is not a short string");
            }
            handover.add(note.asText());
        }
        return new ThreadSummary(summary, handover, AnalysisSource.LLM);
    }

    // ------------------------------------------------------------------ plumbing and validation

    private JsonNode ask(String promptName, ObjectNode payload) {
        Duration timeout = Duration.ofSeconds(config.current().intValue(ConfigKey.AI_TIMEOUT_SECONDS));
        String raw = client.complete(prompts.get(promptName), mapper.writeValueAsString(payload), timeout);
        return parseStrictJson(raw);
    }

    /** Accepts the answer only if it is one JSON object (a markdown fence around it is tolerated). */
    private JsonNode parseStrictJson(String raw) {
        String text = raw == null ? "" : raw.strip();
        if (text.startsWith("```")) {
            text = text.replaceFirst("^```[a-zA-Z]*\\s*", "").replaceFirst("\\s*```$", "").strip();
        }
        if (!text.startsWith("{") || !text.endsWith("}")) {
            throw new InvalidLlmResponseException("not a JSON object");
        }
        try {
            JsonNode node = mapper.readTree(text);
            if (!node.isObject()) {
                throw new InvalidLlmResponseException("not a JSON object");
            }
            return node;
        } catch (tools.jackson.core.JacksonException ex) {
            throw new InvalidLlmResponseException("unreadable JSON");
        }
    }

    private void categories(ObjectNode payload, AnalysisContext context) {
        ArrayNode list = payload.putArray("categories");
        for (CategoryOption option : context.categories()) {
            list.addObject().put("id", option.id()).put("name", option.name());
        }
    }

    /** The category the model named, checked against the active list; null if it answered null. */
    private CategoryOption category(JsonNode answer, AnalysisContext context) {
        if (!answer.has("categoryId")) {
            throw new InvalidLlmResponseException("categoryId is missing");
        }
        JsonNode id = answer.get("categoryId");
        if (id.isNull()) {
            return null;
        }
        if (!id.isIntegralNumber()) {
            throw new InvalidLlmResponseException("categoryId is not a whole number");
        }
        Set<Long> known = context.categories().stream().map(CategoryOption::id).collect(Collectors.toSet());
        if (!known.contains(id.asLong())) {
            throw new InvalidLlmResponseException("categoryId is not an active category");
        }
        return context.categories().stream().filter(c -> c.id().equals(id.asLong())).findFirst().orElseThrow();
    }

    private static double confidence(JsonNode answer) {
        JsonNode value = answer.path("confidence");
        if (!value.isNumber() || value.asDouble() < 0 || value.asDouble() > 1) {
            throw new InvalidLlmResponseException("confidence must be a number from 0 to 1");
        }
        return Math.round(value.asDouble() * 100.0) / 100.0;
    }

    private static String reason(JsonNode answer) {
        JsonNode value = answer.path("reason");
        if (!value.isString()) {
            throw new InvalidLlmResponseException("reason must be text");
        }
        String reason = value.asText().replaceAll("\\s+", " ").strip();
        return reason.length() <= MAX_REASON ? reason : reason.substring(0, MAX_REASON - 1) + "…";
    }

    private static int level(JsonNode answer, String field) {
        JsonNode value = answer.path(field);
        if (!value.isIntegralNumber() || value.asInt() < 1 || value.asInt() > 5) {
            throw new InvalidLlmResponseException(field + " must be a whole number from 1 to 5");
        }
        return value.asInt();
    }

    private static String text(JsonNode answer, String field, int max) {
        JsonNode value = answer.path(field);
        if (!value.isString() || value.asText().isBlank() || value.asText().length() > max) {
            throw new InvalidLlmResponseException(field + " must be non-empty text of at most " + max + " characters");
        }
        return value.asText().strip();
    }
}
