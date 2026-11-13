package com.iitsm.infrastructure.ai;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.core.io.ClassPathResource;

/**
 * The prompts live in resource files ({@code ai/prompts/*.txt}), not in Java strings, so the Report and Content
 * teammate can refine them without touching code. Each file is read once.
 */
class PromptLibrary {

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    String get(String name) {
        return cache.computeIfAbsent(name, key -> {
            try (InputStream in = new ClassPathResource("ai/prompts/" + key + ".txt").getInputStream()) {
                return new String(in.readAllBytes(), StandardCharsets.UTF_8).strip();
            } catch (IOException ex) {
                throw new IllegalStateException("Missing prompt file ai/prompts/" + key + ".txt", ex);
            }
        });
    }
}
