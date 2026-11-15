package com.iitsm.infrastructure.ai;

import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.intelligence.EmbeddingClient;
import com.iitsm.domain.intelligence.CircuitBreaker;
import com.iitsm.domain.intelligence.KeywordDictionary;
import com.iitsm.domain.intelligence.KeywordTextAnalysisService;
import com.iitsm.domain.intelligence.LlmClient;
import com.iitsm.domain.intelligence.TextAnalysisService;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;

/**
 * Wires the intelligence module: the keyword dictionary from {@code ai/keywords.json}, the two engines, the LLM
 * client (Gemini by default, Anthropic, or the scripted one when {@code app.llm.provider=fake}), the circuit breaker,
 * and the
 * {@code @Primary} {@link FallbackTextAnalysisService} that the rest of the application injects.
 */
@Configuration
@EnableConfigurationProperties({LlmProperties.class, EmbeddingProperties.class})
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

    /** The adapter chosen by {@code app.llm.provider}: gemini (default), anthropic or fake. */
    @Bean
    LlmClient llmClient(LlmProperties properties, ObjectMapper mapper) {
        return switch (properties.provider()) {
            case LlmProperties.FAKE -> new ScriptedLlmClient(mapper);
            case LlmProperties.ANTHROPIC -> new AnthropicLlmClient(properties, mapper);
            case LlmProperties.GEMINI -> new GeminiLlmClient(properties, mapper);
            default -> throw new IllegalStateException("app.llm.provider must be gemini, anthropic or fake, not '"
                    + properties.provider() + "'");
        };
    }

    /**
     * The embedding adapter: Gemini when there is a key (EMBEDDING_API_KEY, or the LLM key if the LLM provider is
     * also Gemini), else the disabled one. The Anthropic key is never used here.
     */
    @Bean
    EmbeddingClient embeddingClient(EmbeddingProperties properties, LlmProperties llm, ObjectMapper mapper) {
        String key = properties.apiKey();
        if ((key == null || key.isBlank()) && LlmProperties.GEMINI.equals(llm.provider())) {
            key = llm.apiKey();
        }
        if (EmbeddingProperties.NONE.equals(properties.provider()) || key == null || key.isBlank()) {
            return new DisabledEmbeddingClient();
        }
        return new GeminiEmbeddingClient(properties, key, mapper);
    }

    @Bean("embeddingExecutor")
    Executor embeddingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(1_000);
        executor.setThreadNamePrefix("embedding-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(5);
        return executor;
    }

    @Bean
    CircuitBreaker llmCircuitBreaker() {
        return new CircuitBreaker();
    }

    @Bean
    @Primary
    TextAnalysisService textAnalysisService(KeywordTextAnalysisService keyword, LlmClient client, ObjectMapper mapper,
                                            ConfigService config, CircuitBreaker breaker, Clock clock,
                                            MeterRegistry metrics) {
        LlmTextAnalysisService llm = new LlmTextAnalysisService(client, new PromptLibrary(), keyword, mapper, config);
        return new FallbackTextAnalysisService(llm, keyword, client, config, breaker, clock, metrics);
    }
}
