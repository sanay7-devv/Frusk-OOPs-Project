package com.iitsm.domain.intelligence;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;

/**
 * The editable knowledge of the offline engine (resource file {@code ai/keywords.json}, loaded by the
 * infrastructure layer): which words point to which kind of problem, and which phrases signal a large impact or an
 * urgent need. Categories are admin-managed, so the dictionary is organised by <em>topic</em>: a category is linked
 * to every topic whose name words appear in the category's own name ("Network and Connectivity" gets the network
 * topic), and its own name words always count as well.
 */
public final class KeywordDictionary {

    /** A kind of problem: the words that link a category to it, and the weighted words that signal it. */
    public record Topic(String id, Set<String> nameStems, Map<String, Double> terms) {
    }

    /** A phrase that signals a level from 1 to 5, matched as whole words in lower-case text. */
    public record Cue(int level, String phrase, Pattern pattern) {

        static Cue of(int level, String phrase) {
            String normal = phrase.toLowerCase(Locale.ROOT).strip();
            return new Cue(level, normal,
                    Pattern.compile("(?<![a-z0-9])" + Pattern.quote(normal) + "(?![a-z0-9])"));
        }
    }

    private final List<Topic> topics;
    private final List<Cue> impactCues;
    private final List<Cue> urgencyCues;

    /**
     * @param topics       topic id to its name words and weighted terms (raw words; stemmed here)
     * @param impactCues   impact level (1 to 5) to the phrases that signal it
     * @param urgencyCues  urgency level (1 to 5) to the phrases that signal it
     */
    public KeywordDictionary(Map<String, TopicSource> topics, Map<Integer, List<String>> impactCues,
                             Map<Integer, List<String>> urgencyCues) {
        List<Topic> built = new ArrayList<>();
        topics.forEach((id, source) -> built.add(new Topic(id, stems(source.names()), stemmedTerms(source.terms()))));
        this.topics = List.copyOf(built);
        this.impactCues = cues(impactCues);
        this.urgencyCues = cues(urgencyCues);
    }

    /** Raw topic definition as written in the resource file. */
    public record TopicSource(List<String> names, Map<String, Double> terms) {
    }

    public List<Topic> topics() {
        return topics;
    }

    public List<Cue> impactCues() {
        return impactCues;
    }

    public List<Cue> urgencyCues() {
        return urgencyCues;
    }

    /** A small dictionary for callers without a resource file (tests): no topics and no cues. */
    public static KeywordDictionary empty() {
        return new KeywordDictionary(Map.of(), Map.of(), Map.of());
    }

    private static Set<String> stems(List<String> words) {
        Set<String> result = new java.util.HashSet<>();
        words.forEach(word -> result.addAll(Tokenizer.tokens(word)));
        return Set.copyOf(result);
    }

    /** A term of several words ("access denied") is stored as its stems joined by a space, all of which must appear. */
    private static Map<String, Double> stemmedTerms(Map<String, Double> terms) {
        Map<String, Double> result = new LinkedHashMap<>();
        terms.forEach((term, weight) -> {
            List<String> tokens = Tokenizer.tokens(term);
            if (!tokens.isEmpty()) {
                result.merge(String.join(" ", tokens), weight, Math::max);
            }
        });
        return Map.copyOf(result);
    }

    private static List<Cue> cues(Map<Integer, List<String>> byLevel) {
        List<Cue> result = new ArrayList<>();
        new TreeMap<>(byLevel).forEach((level, phrases) -> phrases.forEach(phrase -> result.add(Cue.of(level, phrase))));
        return List.copyOf(result);
    }
}
