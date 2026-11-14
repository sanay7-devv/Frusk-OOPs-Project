package com.iitsm.domain.attachment;

import java.text.Normalizer;

/**
 * Safe display names for uploaded files (handbook 2.5 M14 "safe file names"). The file on disk always has a random
 * name, so no user text ever reaches a path; the display name is still cleaned because it is shown in the UI and sent
 * back in {@code Content-Disposition}: folders, control characters and characters special in Windows or in HTTP
 * headers are replaced, leading dots are removed, and the length fits the column (200).
 */
public final class AttachmentName {

    public static final int MAX_LENGTH = 200;
    private static final String SPECIAL = "<>:\"|?*;%";

    private AttachmentName() {
    }

    /** A clean name, or {@code fallback} when nothing usable is left (for example the name was only "../"). */
    public static String sanitize(String original, String fallback) {
        if (original == null) {
            return fallback;
        }
        String name = Normalizer.normalize(original, Normalizer.Form.NFC);
        // keep the last path segment only (a browser may send C:\Users\me\x.png, a client ../../x.png)
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        name = name.substring(slash + 1);
        StringBuilder clean = new StringBuilder(name.length());
        name.codePoints().forEach(cp -> {
            boolean control = Character.isISOControl(cp) || Character.getType(cp) == Character.FORMAT;
            clean.appendCodePoint(control || SPECIAL.indexOf(cp) >= 0 ? '_' : cp);
        });
        String result = clean.toString().strip();
        while (result.startsWith(".")) {
            result = result.substring(1); // no hidden files, no "..", no ".htaccess"
        }
        if (result.isBlank()) {
            return fallback;
        }
        if (result.length() > MAX_LENGTH) {
            int dot = result.lastIndexOf('.');
            String ext = dot > 0 && result.length() - dot <= 10 ? result.substring(dot) : "";
            result = result.substring(0, MAX_LENGTH - ext.length()) + ext;
        }
        return result;
    }
}
