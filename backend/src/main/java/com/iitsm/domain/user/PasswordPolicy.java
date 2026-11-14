package com.iitsm.domain.user;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * The password rules (handbook 2.5 M14, DEC-92). Pure Java, no framework: the web layer calls it from a validator.
 * <ol>
 *   <li>the contract rule (API Data Dictionary C.3): 8 to 72 characters, at least one letter and one digit;</li>
 *   <li>at most 72 <b>bytes</b> (BCrypt cannot hash more; 72 accented letters would be 144 bytes);</li>
 *   <li>not a common password: a word from {@link #COMMON}, alone or followed by up to 4 digits or symbols
 *       ("password1", "Welcome123!"), compared in lower case;</li>
 *   <li>does not contain the e-mail's local part (4 or more characters) or a word of the person's name (4 or more).</li>
 * </ol>
 * Each rule has its own message, so the form says what to change (NIST SP 800-63B favours a blocklist and length
 * over composition rules).
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 72;

    private static final int MIN_PERSONAL_PART = 4;
    private static final int MAX_SUFFIX = 4;

    /** Base words of the usual "most common passwords" lists, lower case. */
    static final Set<String> COMMON = Set.of(
            "password", "passw0rd", "p@ssw0rd", "p@ssword", "qwerty", "qwertyuiop", "qwerty123", "asdfgh",
            "asdfghjkl", "zxcvbn", "zxcvbnm", "azerty", "letmein", "welcome", "admin", "administrator", "root",
            "login", "master", "abc123", "abcd1234", "abcdefgh", "iloveyou", "monkey", "dragon", "football",
            "baseball", "basketball", "cricket", "superman", "batman", "spiderman", "starwars", "sunshine",
            "princess", "shadow", "trustno1", "whatever", "freedom", "secret", "changeme", "default", "guest",
            "test", "testing", "temp", "temporary", "hello", "helloworld", "computer", "internet", "service",
            "support", "helpdesk", "iitsm", "campus", "student", "teacher", "college", "university", "india",
            "delhi", "mumbai", "bangalore", "krishna", "ganesh", "sachin", "rahul", "priya", "summer", "winter",
            "spring", "autumn", "monday", "friday", "january", "december", "google", "facebook", "youtube",
            "amazon", "microsoft", "apple", "samsung", "pokemon", "minecraft", "ninja", "hunter", "killer",
            "michael", "jordan", "charlie", "jessica", "123456", "1234567", "12345678", "123456789", "1234567890",
            "111111", "000000", "654321", "987654321", "1q2w3e4r", "1qaz2wsx", "q1w2e3r4", "qazwsx", "123qwe",
            "qwe123", "pass1234", "pass", "access", "mustang");

    private PasswordPolicy() {
    }

    /** The first rule the password breaks, as a message for the "password" field, or empty if it is acceptable. */
    public static Optional<String> check(String password, String name, String email) {
        if (password == null) {
            return Optional.of("must not be empty");
        }
        if (password.length() < MIN_LENGTH || password.length() > MAX_LENGTH) {
            return Optional.of("must be " + MIN_LENGTH + " to " + MAX_LENGTH + " characters");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_LENGTH) {
            return Optional.of("is too long once encoded (at most " + MAX_LENGTH
                    + " bytes; accented letters count double)");
        }
        if (password.chars().noneMatch(Character::isLetter) || password.chars().noneMatch(Character::isDigit)) {
            return Optional.of("must contain at least one letter and one digit");
        }
        String lower = password.toLowerCase(Locale.ROOT);
        if (isCommon(lower)) {
            return Optional.of("is too common; choose something less guessable");
        }
        if (containsPersonalPart(lower, name, email)) {
            return Optional.of("must not contain your name or the first part of your e-mail address");
        }
        return Optional.empty();
    }

    /** A blocklisted word, optionally followed by a few digits or symbols. */
    static boolean isCommon(String lower) {
        for (String word : COMMON) {
            if (lower.startsWith(word) && lower.length() - word.length() <= MAX_SUFFIX
                    && lower.substring(word.length()).chars().noneMatch(Character::isLetter)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsPersonalPart(String lower, String name, String email) {
        if (email != null) {
            String local = email.toLowerCase(Locale.ROOT);
            int at = local.indexOf('@');
            local = at > 0 ? local.substring(0, at) : local;
            if (local.length() >= MIN_PERSONAL_PART && lower.contains(local)) {
                return true;
            }
        }
        if (name != null) {
            for (String part : name.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
                if (part.length() >= MIN_PERSONAL_PART && lower.contains(part)) {
                    return true;
                }
            }
        }
        return false;
    }
}
