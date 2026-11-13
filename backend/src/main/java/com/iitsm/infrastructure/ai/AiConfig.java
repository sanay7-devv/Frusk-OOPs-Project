package com.iitsm.infrastructure.ai;

import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.ClassPathResource;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.intelligence.CircuitBreaker;
import com.iitsm.domain.intelligence.KeywordDictionary;
import com.iitsm.domain.intelligence.KeywordTextAnalysisService;
import com.iitsm.domain.intelligence.LlmClient;
import com.iitsm.domain.intelligence.TextAnalysisService;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Wires the intelligence module: the keyword dictionary from {@code ai/keywords.json}, the two engines, the LLM
 * client (the real API, or the scripted one when {@code app.llm.provider=fake}), the circuit breaker, and the
 * {@code @Primary} {@link FallbackTextAnalysisService} that the rest of the application injects.
 */
@Configuration
@EnableConfigurationProperties(LlmProperties.class)
public class AiConfig {

    @Bean
    KeywordDictionary keywordDictionary(ObjectMapper mapper) throws IOException {
        JsonNode root;
        try (InputStream in = new ClassPathResource("ai/keywords.json").getInputStream()) {
            root = mapper.readTree(in);
        }
        Map<String, KeywordDictionary.TopicSource> topics = new LinkedHashMap<>();
        root.path("topics").properties().forEach(topic -> {
            List<String> names = new ArrayList<>();
            topic.getValue().path("names").forEach(n -> names.add(n.asText()));
            Map<String, Double> terms = new LinkedHashMap<>();
            topic.getValue().path("terms").properties().forEach(t -> terms.put(t.getKey(), t.getValue().asDouble()));
            topics.put(topic.getKey(), new KeywordDictionary.TopicSource(names, terms));
        });
        return new KeywordDictionary(topics, cues(root.path("impact")), cues(root.path("urgency")));
    }

    private static Map<Integer, List<String>> cues(JsonNode node) {
        Map<Integer, List<String>> result = new LinkedHashMap<>();
        node.properties().forEach(level -> {
            List<String> phrases = new ArrayList<>();
            level.getValue().forEach(p -> phrases.add(p.asText()));
            result.put(Integer.parseInt(level.getKey()), phrases);
        });
        return result;
    }

    @Bean
    KeywordTextAnalysisService keywordTextAnalysisService(KeywordDictionary dictionary) {
        return new KeywordTextAnalysisService(dictionary);
    }

    @Bean
    LlmClient llmClient(LlmProperties properties, ObjectMapper mapper) {
        return "fake".equalsIgnoreCase(properties.provider())
                ? new ScriptedLlmClient(mapper)
                : new AnthropicLlmClient(properties, mapper);
    }

    @Bean
    CircuitBreaker llmCircuitBreaker() {
        return new CircuitBreaker();
    }

    @Bean
    @Primary
    TextAnalysisService textAnalysisService(KeywordTextAnalysisService keyword, LlmClient client, ObjectMapper mapper,
                                            ConfigService config, CircuitBreaker breaker, Clock clock) {
        LlmTextAnalysisService llm = new LlmTextAnalysisService(client, new PromptLibrary(), keyword, mapper, config);
        return new FallbackTextAnalysisService(llm, keyword, client, config, breaker, clock);
    }
}
