package com.iitsm.domain.notification;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Factory pattern: builds the title and the message of a notification from a template and the values of one event
 * (handbook 2.5 M9, decision DEC-40). The wording lives in a resource file with placeholders such as {@code {code}}
 * and {@code {priority}}, so the Report teammate can refine it without touching code.
 * <p>
 * Template keys, most specific first: {@code <EVENT>.<audience>.title}, then {@code <EVENT>.title}; the same for
 * {@code .message}. A digest uses {@code <EVENT>.digest.title} and {@code .message}. A placeholder without a value
 * becomes an empty string. Plain Java: the file is read by the caller and handed in as a map.
 */
public class NotificationFactory {

    /** The contract keeps titles under 60 characters (API Data Dictionary C.7). */
    public static final int MAX_TITLE_LENGTH = 59;

    /** The words of one notification. */
    public record Content(String title, String message) {
    }

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{([A-Za-z]+)}");

    private final Map<String, String> templates;

    public NotificationFactory(Map<String, String> templates) {
        this.templates = Map.copyOf(templates);
    }

    /** Words for one person (or the chat room) and one event. */
    public Content create(NotificationEventType type, Audience audience, Map<String, String> values) {
        return build(type.name() + "." + audience.templateKey(), type.name(), values);
    }

    /** Words for a digest that folds several events of one type into one notification. */
    public Content digest(NotificationEventType type, Map<String, String> values) {
        return build(type.name() + ".digest", type.name() + ".digest", values);
    }

    private Content build(String specificKey, String generalKey, Map<String, String> values) {
        String title = fill(lookup(specificKey, generalKey, "title"), values);
        String message = fill(lookup(specificKey, generalKey, "message"), values);
        return new Content(shorten(title), message);
    }

    private String lookup(String specificKey, String generalKey, String part) {
        String text = templates.get(specificKey + "." + part);
        if (text == null) {
            text = templates.get(generalKey + "." + part);
        }
        if (text == null) {
            text = "{code}";
        }
        return text;
    }

    private static String fill(String template, Map<String, String> values) {
        Matcher matcher = PLACEHOLDER.matcher(template);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String value = values.getOrDefault(matcher.group(1), "");
            matcher.appendReplacement(out, Matcher.quoteReplacement(value == null ? "" : value));
        }
        matcher.appendTail(out);
        return out.toString().strip();
    }

    private static String shorten(String title) {
        return title.length() <= MAX_TITLE_LENGTH ? title : title.substring(0, MAX_TITLE_LENGTH - 1) + "…";
    }
}
