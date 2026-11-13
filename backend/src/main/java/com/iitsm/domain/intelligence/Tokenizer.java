package com.iitsm.domain.intelligence;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Turns incident text into comparable word stems: lower case, letters and digits only, common filler words dropped
 * and a light suffix stemmer so "disconnects", "disconnected" and "disconnecting" are one word. Deterministic and
 * language-simple on purpose: the same text always gives the same tokens, which is what makes the keyword path
 * explainable and testable.
 */
public final class Tokenizer {

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "about", "after", "again", "all", "also", "am", "an", "and", "any", "are", "as", "at", "be",
            "because", "been", "before", "but", "by", "can", "could", "did", "do", "does", "doing", "done", "for",
            "from", "get", "gets", "got", "had", "has", "have", "having", "he", "her", "here", "him", "his", "how",
            "i", "if", "in", "into", "is", "it", "its", "just", "me", "more", "my", "no", "not", "now", "of", "on",
            "once", "only", "or", "other", "our", "out", "over", "please", "she", "should", "since", "so", "some",
            "still", "such", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this",
            "those", "to", "too", "under", "until", "up", "us", "very", "was", "we", "were", "what", "when",
            "where", "which", "while", "who", "will", "with", "would", "you", "your", "hi", "hello", "thanks",
            "thank", "yesterday", "today", "morning", "need", "needs", "want", "seem", "seems");

    private Tokenizer() {
    }

    /** The stems of every meaningful word in the text, in order, repeats kept (for term frequency). */
    public static List<String> tokens(String text) {
        List<String> result = new ArrayList<>();
        if (text == null) {
            return result;
        }
        StringBuilder word = new StringBuilder();
        String lower = text.toLowerCase(Locale.ROOT);
        for (int i = 0; i <= lower.length(); i++) {
            char c = i < lower.length() ? lower.charAt(i) : ' ';
            if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
                word.append(c);
            } else if (!word.isEmpty()) {
                addToken(result, word.toString());
                word.setLength(0);
            }
        }
        return result;
    }

    private static void addToken(List<String> out, String word) {
        if (word.length() < 2 || STOP_WORDS.contains(word)) {
            return;
        }
        out.add(stem(word));
    }

    /**
     * Light stemmer: plural, -ing and -ed endings, then a final silent e, so "share", "shared" and "sharing" meet at
     * "shar". Never shortens a word below three letters. The same function stems the dictionary and the texts, so
     * the exact stem does not matter, only that related forms agree.
     */
    static String stem(String word) {
        if (word.length() <= 3 || Character.isDigit(word.charAt(0))) {
            return word;
        }
        String stem = withoutSuffix(word);
        if (stem.length() > 4 && stem.endsWith("e")) {
            stem = stem.substring(0, stem.length() - 1);
        }
        return stem;
    }

    private static String withoutSuffix(String word) {
        if (word.endsWith("ies") && word.length() > 4) {
            return word.substring(0, word.length() - 3) + "y";
        }
        if (word.endsWith("sses")) {
            return word.substring(0, word.length() - 2);
        }
        if (word.endsWith("ing") && word.length() - 3 >= 3) {
            return undouble(word.substring(0, word.length() - 3));
        }
        if (word.endsWith("ed") && word.length() - 2 >= 3) {
            return undouble(word.substring(0, word.length() - 2));
        }
        if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us") && !word.endsWith("is")) {
            return word.substring(0, word.length() - 1);
        }
        return word;
    }

    /** "dropp" (from "dropping") becomes "drop"; "install" (from "installing") keeps its double l. */
    private static String undouble(String stem) {
        int n = stem.length();
        if (n >= 2 && stem.charAt(n - 1) == stem.charAt(n - 2) && "lsz".indexOf(stem.charAt(n - 1)) < 0) {
            return stem.substring(0, n - 1);
        }
        return stem;
    }
}
