package com.iitsm.domain.user;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.OptionalLong;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Time-based one-time passwords (RFC 6238, with RFC 4226 truncation), the codes an authenticator app shows
 * (A12, decision DEC-116). Pure Java: no Spring, no I/O, the clock is passed in.
 *
 * <p>Six digits, a 30 second step, HMAC-SHA1 (what every authenticator app supports). A code is accepted for the
 * step it belongs to and one step either side (clock drift of up to 30 seconds), and never twice: the caller passes
 * the last step it accepted and only a later step passes, so a code seen by someone watching cannot be replayed.
 */
public final class Totp {

    public static final int DIGITS = 6;
    public static final long STEP_SECONDS = 30;
    private static final int DRIFT_STEPS = 1;
    private static final int SECRET_BYTES = 20;
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private Totp() {
    }

    /** A new random secret, 160 bits, in the Base32 form authenticator apps expect. */
    public static String newSecret(SecureRandom random) {
        byte[] bytes = new byte[SECRET_BYTES];
        random.nextBytes(bytes);
        return encode(bytes);
    }

    /** The 30 second step a moment falls in (seconds since 1970 divided by 30). */
    public static long stepAt(Instant moment) {
        return Math.floorDiv(moment.getEpochSecond(), STEP_SECONDS);
    }

    /** The code for one step. */
    public static String codeFor(String base32Secret, long step) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(decode(base32Secret), "HmacSHA1"));
            byte[] hash = mac.doFinal(ByteBuffer.allocate(Long.BYTES).putLong(step).array());
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24) | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8) | (hash[offset + 3] & 0xFF);
            int code = binary % (int) Math.pow(10, DIGITS);
            return String.format("%0" + DIGITS + "d", code);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("HMAC-SHA1 is always available in the JDK", ex);
        }
    }

    /**
     * Checks a code typed by a person.
     *
     * @param lastAcceptedStep the step of the last code this account used (0 if none); only later steps pass
     * @return the step the code belongs to, to be stored as the new last accepted step; empty if the code is wrong,
     *         malformed or already used
     */
    public static OptionalLong verify(String base32Secret, String code, Instant now, long lastAcceptedStep) {
        if (code == null || !code.strip().matches("\\d{" + DIGITS + "}")) {
            return OptionalLong.empty();
        }
        byte[] given = code.strip().getBytes(StandardCharsets.UTF_8);
        long current = stepAt(now);
        OptionalLong match = OptionalLong.empty();
        for (long step = current - DRIFT_STEPS; step <= current + DRIFT_STEPS; step++) {
            // every step is computed and compared in constant time, so a near miss costs the same as a hit
            boolean same = MessageDigest.isEqual(codeFor(base32Secret, step).getBytes(StandardCharsets.UTF_8), given);
            if (same && step > lastAcceptedStep && match.isEmpty()) {
                match = OptionalLong.of(step);
            }
        }
        return match;
    }

    /** The otpauth address an authenticator app reads from a QR code. */
    public static String otpauthUri(String issuer, String account, String base32Secret) {
        String label = java.net.URLEncoder.encode(issuer + ":" + account, StandardCharsets.UTF_8).replace("+", "%20");
        String encodedIssuer = java.net.URLEncoder.encode(issuer, StandardCharsets.UTF_8).replace("+", "%20");
        return "otpauth://totp/" + label + "?secret=" + base32Secret + "&issuer=" + encodedIssuer
                + "&algorithm=SHA1&digits=" + DIGITS + "&period=" + STEP_SECONDS;
    }

    static String encode(byte[] bytes) {
        StringBuilder out = new StringBuilder();
        int buffer = 0;
        int bits = 0;
        for (byte b : bytes) {
            buffer = (buffer << 8) | (b & 0xFF);
            bits += 8;
            while (bits >= 5) {
                out.append(BASE32.charAt((buffer >> (bits - 5)) & 0x1F));
                bits -= 5;
            }
        }
        if (bits > 0) {
            out.append(BASE32.charAt((buffer << (5 - bits)) & 0x1F));
        }
        return out.toString();
    }

    static byte[] decode(String base32) {
        String clean = base32.strip().replace("=", "").replace(" ", "").toUpperCase();
        ByteBuffer out = ByteBuffer.allocate(clean.length() * 5 / 8 + 1);
        int buffer = 0;
        int bits = 0;
        for (char c : clean.toCharArray()) {
            int value = BASE32.indexOf(c);
            if (value < 0) {
                throw new IllegalArgumentException("not a Base32 secret");
            }
            buffer = (buffer << 5) | value;
            bits += 5;
            if (bits >= 8) {
                out.put((byte) ((buffer >> (bits - 8)) & 0xFF));
                bits -= 8;
            }
        }
        byte[] result = new byte[out.position()];
        out.flip();
        out.get(result);
        return result;
    }
}
