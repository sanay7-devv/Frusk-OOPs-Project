package com.iitsm.domain.intelligence;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The offline engine (DEC-42): TF-IDF cosine for similarity and a keyword dictionary blended with what past
 * incidents were categorised as. No network, no key, no randomness, so a given text always gives the same answer and
 * every answer can be explained in one line. It is the default similarity engine and the fallback for everything
 * else when the LLM is off, slow or wrong.
 * <p>
 * <b>Category.</b> Two independent signals are combined like two witnesses: the dictionary (weighted words that
 * point to the category) and the nearest past incidents that people categorised. Each gives a confidence from 0 to 1;
 * together they give {@code 1 - (1 - dictionary) * (1 - history)}, so agreement raises confidence and a single weak
 * signal stays below the 0.60 display threshold.
 */
public class KeywordTextAnalysisService implements TextAnalysisService {

    /** Past incidents consulted for the history signal, and the smallest similarity that counts as a neighbour. */
    private static final int NEIGHBOURS = 5;
    private static final double MIN_NEIGHBOUR_SIMILARITY = 0.10;
    /** Never claim certainty: a keyword match is evidence, not proof. */
    private static final double MAX_CONFIDENCE = 0.95;
    private static final Pattern WORD = Pattern.compile("[A-Za-z0-9]+");
    private static final Pattern USER_COUNT = Pattern.compile(
            "(\\d{1,6})\\s+(?:\\w+\\s+)?(?:users|people|employees|students|staff|colleagues|customers|machines|computers|devices)");
    private static final int SNIPPET = 160;

    private final KeywordDictionary dictionary;

    public KeywordTextAnalysisService(KeywordDictionary dictionary) {
        this.dictionary = dictionary;
    }

    // ------------------------------------------------------------------ category

    @Override
    public CategorySuggestion suggestCategory(String title, String description, AnalysisContext context) {
        return rankCategories(title, description, context).suggestion();
    }

    private record Ranking(CategorySuggestion suggestion, List<String> matchedWords) {
    }

    private Ranking rankCategories(String title, String description, AnalysisContext context) {
        Set<String> textTokens = new HashSet<>(Tokenizer.tokens(title + " " + description));
        if (textTokens.isEmpty() || context.categories().isEmpty()) {
            return new Ranking(CategorySuggestion.none(AnalysisSource.KEYWORD), List.of());
        }
        Map<Long, Double> historyScores = historyScores(title, description, context);
        CategoryOption best = null;
        double bestConfidence = 0;
        double bestDictionary = 0;
        List<String> bestMatches = List.of();
        double bestHistory = 0;
        for (CategoryOption category : context.categories()) {
            Map<String, Double> terms = termsOf(category);
            List<String> matched = new ArrayList<>();
            double weight = 0;
            for (Map.Entry<String, Double> term : terms.entrySet()) {
                if (textTokens.containsAll(List.of(term.getKey().split(" ")))) {
                    matched.add(term.getKey());
                    weight += term.getValue();
                }
            }
            double dictionaryScore = 1 - Math.pow(0.5, weight);
            double history = historyScores.getOrDefault(category.id(), 0.0);
            double confidence = Math.min(MAX_CONFIDENCE, 1 - (1 - dictionaryScore) * (1 - history));
            if (confidence > bestConfidence || (confidence == bestConfidence && confidence > 0
                    && dictionaryScore > bestDictionary)) {
                best = category;
                bestConfidence = confidence;
                bestDictionary = dictionaryScore;
                bestMatches = matched;
                bestHistory = history;
            }
        }
        if (best == null || bestConfidence <= 0) {
            return new Ranking(CategorySuggestion.none(AnalysisSource.KEYWORD), List.of());
        }
        List<String> words = originalWords(title + " " + description, bestMatches);
        String reason = reasonFor(best, words, bestHistory);
        return new Ranking(new CategorySuggestion(best.id(), best.name(), round(bestConfidence), reason,
                AnalysisSource.KEYWORD), words);
    }

    private static String reasonFor(CategoryOption category, List<String> words, double history) {
        StringBuilder reason = new StringBuilder();
        if (!words.isEmpty()) {
            reason.append("Matched words ").append(String.join(", ", words.subList(0, Math.min(4, words.size()))))
                    .append(" for ").append(category.name());
        }
        if (history > 0) {
            reason.append(reason.isEmpty() ? "Resembles" : "; resembles").append(" earlier incidents categorised as ")
                    .append(category.name());
        }
        return reason.toString();
    }

    /** The weighted words that point to a category: its linked topics plus the words of its own name. */
    private Map<String, Double> termsOf(CategoryOption category) {
        List<String> nameTokens = Tokenizer.tokens(category.name());
        Map<String, Double> terms = new HashMap<>();
        for (KeywordDictionary.Topic topic : dictionary.topics()) {
            if (nameTokens.stream().anyMatch(topic.nameStems()::contains)) {
                topic.terms().forEach((term, weight) -> terms.merge(term, weight, Math::max));
            }
        }
        nameTokens.forEach(token -> terms.merge(token, 1.0, Math::max));
        return terms;
    }

    /** For each category: share of the nearest categorised incidents that carry it, times its best similarity. */
    private static Map<Long, Double> historyScores(String title, String description, AnalysisContext context) {
        if (context.history().isEmpty()) {
            return Map.of();
        }
        TfIdfModel model = TfIdfModel.fromCorpus(context.corpus());
        TfIdfModel.Vector query = model.vectorize(title, description);
        record Neighbour(Long categoryId, double similarity) {
        }
        List<Neighbour> nearest = context.history().stream()
                .map(h -> new Neighbour(h.categoryId(), TfIdfModel.cosine(query, model.vectorize("", h.text()))))
                .filter(n -> n.similarity() >= MIN_NEIGHBOUR_SIMILARITY)
                .sorted(Comparator.comparingDouble(Neighbour::similarity).reversed())
                .limit(NEIGHBOURS)
                .toList();
        double total = nearest.stream().mapToDouble(Neighbour::similarity).sum();
        Map<Long, Double> shares = new HashMap<>();
        Map<Long, Double> bests = new HashMap<>();
        for (Neighbour n : nearest) {
            shares.merge(n.categoryId(), n.similarity(), Double::sum);
            bests.merge(n.categoryId(), n.similarity(), Math::max);
        }
        Map<Long, Double> scores = new HashMap<>();
        shares.forEach((id, share) -> scores.put(id, (share / total) * bests.get(id)));
        return scores;
    }

    /** The words as the reporter wrote them whose stem is one of the matched stems (for readable reasons). */
    private static List<String> originalWords(String text, List<String> matchedStems) {
        Set<String> stems = new HashSet<>();
        matchedStems.forEach(term -> stems.addAll(List.of(term.split(" "))));
        Set<String> words = new LinkedHashSet<>();
        Matcher matcher = WORD.matcher(text.toLowerCase(Locale.ROOT));
        while (matcher.find()) {
            List<String> stem = Tokenizer.tokens(matcher.group());
            if (!stem.isEmpty() && stems.contains(stem.get(0))) {
                words.add(matcher.group());
            }
        }
        return List.copyOf(words);
    }

    // ------------------------------------------------------------------ intake

    @Override
    public IntakeSuggestion suggestIntake(String description, AnalysisContext context) {
        Ranking ranking = rankCategories("", description, context);
        CategorySuggestion category = ranking.suggestion();
        String text = description == null ? "" : description.toLowerCase(Locale.ROOT).replace('’', '\'');
        Level impact = strongest(dictionary.impactCues(), text);
        Level urgency = strongest(dictionary.urgencyCues(), text);
        int impactLevel = impact.level();
        Matcher users = USER_COUNT.matcher(text);
        boolean countFound = false;
        if (users.find()) {
            int count = Integer.parseInt(users.group(1));
            int fromCount = count >= 100 ? 5 : count >= 20 ? 4 : count >= 3 ? 3 : 0;
            if (fromCount > 0) {
                countFound = true;
                impactLevel = Math.max(impactLevel, fromCount);
            }
        }
        int hits = (impact.phrase() != null ? 1 : 0) + (urgency.phrase() != null ? 1 : 0) + (countFound ? 1 : 0);
        double cueConfidence = 1 - Math.pow(0.55, hits);
        double confidence = round(Math.min(MAX_CONFIDENCE, 1 - (1 - category.confidence()) * (1 - cueConfidence)));

        List<String> parts = new ArrayList<>();
        if (category.categoryId() != null && !category.reason().isEmpty()) {
            parts.add(category.reason());
        }
        if (impact.phrase() != null) {
            parts.add("impact " + impactLevel + " from '" + impact.phrase() + "'");
        } else if (countFound) {
            parts.add("impact " + impactLevel + " from the number of people affected");
        }
        if (urgency.phrase() != null) {
            parts.add("urgency " + urgency.level() + " from '" + urgency.phrase() + "'");
        }
        return new IntakeSuggestion(category.categoryId(), category.categoryName(), impactLevel, urgency.level(),
                confidence, String.join("; ", parts), AnalysisSource.KEYWORD);
    }

    private record Level(int level, String phrase) {
    }

    /** The most specific matching phrase wins ("not urgent" beats "urgent"); no match means the neutral 3. */
    private static Level strongest(List<KeywordDictionary.Cue> cues, String text) {
        KeywordDictionary.Cue best = null;
        for (KeywordDictionary.Cue cue : cues) {
            if (cue.pattern().matcher(text).find() && (best == null || cue.phrase().length() > best.phrase().length()
                    || (cue.phrase().length() == best.phrase().length() && cue.level() > best.level()))) {
                best = cue;
            }
        }
        return best == null ? new Level(3, null) : new Level(best.level(), best.phrase());
    }

    // ------------------------------------------------------------------ similarity

    @Override
    public List<SimilarMatch> findSimilar(String title, String description, List<TextRecord> candidates,
                                          List<String> corpus) {
        TfIdfModel model = TfIdfModel.fromCorpus(corpus);
        TfIdfModel.Vector query = model.vectorize(title, description);
        List<SimilarMatch> matches = new ArrayList<>();
        for (TextRecord candidate : candidates) {
            double similarity = TfIdfModel.cosine(query, model.vectorize(candidate.title(), candidate.body()));
            if (similarity > 0) {
                matches.add(new SimilarMatch(candidate.id(), similarity));
            }
        }
        matches.sort(Comparator.comparingDouble(SimilarMatch::similarity).reversed()
                .thenComparing(SimilarMatch::id));
        return matches;
    }

    // ------------------------------------------------------------------ summary

    @Override
    public ThreadSummary summarize(ThreadInput input) {
        long comments = input.entries().stream().filter(e -> e.kind() == ThreadEntry.Kind.COMMENT).count();
        long events = input.entries().size() - comments;
        StringBuilder summary = new StringBuilder();
        summary.append(input.code()).append(" \"").append(input.title()).append("\" is ")
                .append(input.status().toLowerCase(Locale.ROOT).replace('_', ' '));
        if (input.priority() != null) {
            summary.append(", priority ").append(input.priority());
        }
        summary.append(", ").append(input.assignee() == null ? "not assigned yet" : "handled by " + input.assignee())
                .append(". ").append(comments).append(comments == 1 ? " comment" : " comments").append(" and ")
                .append(events).append(events == 1 ? " recorded event." : " recorded events.");
        input.entries().stream().filter(e -> e.kind() == ThreadEntry.Kind.COMMENT)
                .reduce((first, second) -> second)
                .ifPresent(last -> summary.append(" Latest note: ").append(snippet(last.text())).append('.'));
        if (input.resolutionNotes() != null && !input.resolutionNotes().isBlank()) {
            summary.append(" Resolution: ").append(snippet(input.resolutionNotes())).append('.');
        }

        List<String> notes = new ArrayList<>();
        notes.add("Status " + input.status().replace('_', ' ') + ": " + nextStep(input.status()));
        if (input.resolutionDue() != null) {
            notes.add("Resolution due " + input.resolutionDue() + ".");
        }
        List<ThreadEntry> recentComments = input.entries().stream()
                .filter(e -> e.kind() == ThreadEntry.Kind.COMMENT).toList();
        int from = Math.max(0, recentComments.size() - 3);
        for (ThreadEntry comment : recentComments.subList(from, recentComments.size())) {
            notes.add((comment.internal() ? "Internal note" : "Note") + " by " + comment.actor() + ": "
                    + snippet(comment.text()));
        }
        List<ThreadEntry> actions = input.entries().stream().filter(e -> e.kind() == ThreadEntry.Kind.AUDIT).toList();
        int fromAction = Math.max(0, actions.size() - 4);
        for (ThreadEntry action : actions.subList(fromAction, actions.size())) {
            notes.add("Recorded: " + snippet(action.text()));
        }
        return new ThreadSummary(summary.toString(), notes, AnalysisSource.KEYWORD);
    }

    private static String nextStep(String status) {
        return switch (status) {
            case "NEW", "CLASSIFIED" -> "needs a technician to be assigned.";
            case "ASSIGNED" -> "the technician should acknowledge and start work.";
            case "ACKNOWLEDGED" -> "start the investigation.";
            case "IN_PROGRESS" -> "continue the investigation and record what was tried.";
            case "PENDING_USER_INFO" -> "waiting for the reporter's answer; the SLA clock is paused.";
            case "RESOLVED" -> "waiting for the reporter to verify the fix.";
            case "VERIFIED" -> "ready to be closed.";
            case "CLOSED" -> "no further action unless it is reopened.";
            case "REOPENED" -> "the earlier fix did not hold; investigate again.";
            default -> "review the thread.";
        };
    }

    private static String snippet(String text) {
        String flat = text == null ? "" : text.replaceAll("\\s+", " ").strip();
        return flat.length() <= SNIPPET ? flat : flat.substring(0, SNIPPET - 1) + "…";
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
