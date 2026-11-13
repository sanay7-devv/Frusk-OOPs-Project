package com.iitsm.infrastructure.ai;

import java.time.Duration;

import com.iitsm.domain.intelligence.LlmClient;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * A stand-in for the model (app.llm.provider=fake) for demos and smoke runs: always available, never touches the
 * network, answers in the strict JSON the prompts ask for, and can be told to misbehave from inside the incident
 * text, which is how the smoke suite forces failures without a real provider:
 * <ul>
 *   <li>{@code [[LLM_FAIL]]}: throws (an outage);</li>
 *   <li>{@code [[LLM_BAD_JSON]]}: answers with text that is not JSON;</li>
 *   <li>{@code [[LLM_BAD_CATEGORY]]}: answers with a category id that is not in the list.</li>
 * </ul>
 * Its "reason" echoes the redacted text it received, so a check can prove what would have left the system.
 */
class ScriptedLlmClient implements LlmClient {

    private final ObjectMapper mapper;

    ScriptedLlmClient(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public String complete(String systemPrompt, String userMessage, Duration timeout) {
        if (userMessage.contains("[[LLM_FAIL]]")) {
            throw new LlmException("scripted outage");
        }
        if (userMessage.contains("[[LLM_BAD_JSON]]")) {
            return "Sure! The category is probably networking.";
        }
        JsonNode input = mapper.readTree(userMessage);
        String seen = "Scripted model saw: " + (input.path("description").asText() + " " + input.path("title").asText()
                + " " + input.path("text").asText()).strip();
        ObjectNode out = mapper.createObjectNode();
        if (systemPrompt.contains("summarise the thread")) {
            out.put("summary", seen);
            out.putArray("handoverNotes").add("Scripted handover note.");
            return out.toString();
        }
        Long categoryId = pickCategory(input);
        if (userMessage.contains("[[LLM_BAD_CATEGORY]]")) {
            categoryId = 999_999L;
        }
        if (categoryId == null) {
            out.putNull("categoryId");
        } else {
            out.put("categoryId", categoryId);
        }
        if (systemPrompt.contains("fill in an IT incident report")) {
            out.put("impact", 4);
            out.put("urgency", 4);
        }
        out.put("confidence", categoryId == null ? 0.0 : 0.9);
        out.put("reason", seen);
        return out.toString();
    }

    /** The first category whose name has a word of four letters or more that occurs in the text. */
    private static Long pickCategory(JsonNode input) {
        String text = (input.path("description").asText() + " " + input.path("title").asText()).toLowerCase();
        for (JsonNode category : input.path("categories")) {
            for (String word : category.path("name").asText().toLowerCase().split("[^a-z0-9]+")) {
                if (word.length() >= 4 && text.contains(word)) {
                    return category.path("id").asLong();
                }
            }
        }
        return null;
    }
}
