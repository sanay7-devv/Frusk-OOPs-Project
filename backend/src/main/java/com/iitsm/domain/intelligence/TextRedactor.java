package com.iitsm.domain.intelligence;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Removes what must never leave the system before incident text is sent to an outside model (DEC-42): email
 * addresses, IP addresses and secrets such as tokens, keys and "password=..." pairs. The order matters: secrets
 * with a label first, then emails and addresses, then bare long tokens.
 * <p>
 * A rule that is easy to state is easy to test: the placeholder shows what was removed, and the text around it is
 * unchanged, so the model still understands the report.
 */
public final class TextRedactor {

    private record Rule(Pattern pattern, String replacement) {
    }

    private static final List<Rule> RULES = List.of(
            new Rule(Pattern.compile("\\beyJ[\\w-]{5,}\\.[\\w-]{5,}\\.[\\w-]{5,}"), "[token]"),
            new Rule(Pattern.compile("(?i)\\bbearer\\s+[\\w.~+/=-]{8,}"), "Bearer [token]"),
            new Rule(Pattern.compile(
                    "(?i)\\b(password|passwd|pwd|passcode|secret|token|api[-_ ]?key|apikey|authorization)\\b(\\s*[:=]\\s*|\\s+is\\s+)\\S+"),
                    "$1$2[redacted]"),
            new Rule(Pattern.compile("[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+"), "[email]"),
            new Rule(Pattern.compile("\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b"), "[ip]"),
            new Rule(Pattern.compile("(?i)\\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{1,4}\\b"), "[ip]"),
            new Rule(Pattern.compile("\\b(?:sk|pk|ghp|gho|xox[abp]|AKIA)[-_A-Za-z0-9]{10,}"), "[token]"),
            new Rule(Pattern.compile("\\b[0-9a-fA-F]{32,}\\b"), "[token]"),
            new Rule(Pattern.compile("\\b(?=[A-Za-z0-9+/_-]*\\d)(?=[A-Za-z0-9+/_-]*[A-Za-z])[A-Za-z0-9+/_-]{32,}={0,2}"),
                    "[token]"));

    private TextRedactor() {
    }

    public static String redact(String text) {
        if (text == null) {
            return "";
        }
        String result = text;
        for (Rule rule : RULES) {
            result = rule.pattern().matcher(result).replaceAll(rule.replacement());
        }
        return result;
    }
}
