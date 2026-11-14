package com.iitsm.domain.attachment;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * The file types an incident may carry (API Data Dictionary C, Attachment: png, jpg, jpeg, gif, pdf, txt, log).
 * The type is decided from the <b>first bytes</b> of the file (its "magic number"), never from the content type the
 * browser sent, so a program renamed to {@code photo.png} is refused (DEC-42). The name's extension must also belong
 * to the sniffed type. Text files have no magic number: they are accepted when the bytes are UTF-8 without control
 * characters.
 */
public enum AttachmentType {

    PNG("image/png", List.of("png"), bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)),
    JPEG("image/jpeg", List.of("jpg", "jpeg"), bytes(0xFF, 0xD8, 0xFF)),
    GIF("image/gif", List.of("gif"), bytes('G', 'I', 'F', '8')),
    PDF("application/pdf", List.of("pdf"), bytes('%', 'P', 'D', 'F', '-')),
    TEXT("text/plain", List.of("txt", "log"), null);

    private final String contentType;
    private final List<String> extensions;
    private final byte[] magic;

    AttachmentType(String contentType, List<String> extensions, byte[] magic) {
        this.contentType = contentType;
        this.extensions = extensions;
        this.magic = magic;
    }

    public String contentType() {
        return contentType;
    }

    /** Lower-case extensions this type may be named with. */
    public List<String> extensions() {
        return extensions;
    }

    /** Every allowed extension, for error messages. */
    public static List<String> allowedExtensions() {
        return Arrays.stream(values()).flatMap(t -> t.extensions.stream()).toList();
    }

    /** The type of a file judged by its bytes, or empty if it is none of the allowed types. */
    public static Optional<AttachmentType> sniff(byte[] content) {
        for (AttachmentType type : values()) {
            if (type.magic != null && startsWith(content, type.magic)) {
                return Optional.of(type);
            }
        }
        return looksLikeText(content) ? Optional.of(TEXT) : Optional.empty();
    }

    /** True if the file name's extension belongs to this type (a PDF must not be called notes.txt). */
    public boolean matchesName(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 && extensions.contains(filename.substring(dot + 1).toLowerCase(Locale.ROOT));
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        return data.length >= prefix.length && Arrays.equals(data, 0, prefix.length, prefix, 0, prefix.length);
    }

    /** Valid UTF-8 with no NUL or other control bytes except tab, line feed, carriage return and form feed. */
    private static boolean looksLikeText(byte[] content) {
        if (content.length == 0) {
            return false;
        }
        for (byte b : content) {
            int c = b & 0xFF;
            boolean allowedControl = c == '\t' || c == '\n' || c == '\r' || c == 0x0C;
            if ((c < 0x20 && !allowedControl) || c == 0x7F) {
                return false;
            }
        }
        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(content));
            return true;
        } catch (CharacterCodingException ex) {
            return false;
        }
    }

    private static byte[] bytes(int... values) {
        byte[] out = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            out[i] = (byte) values[i];
        }
        return out;
    }
}
