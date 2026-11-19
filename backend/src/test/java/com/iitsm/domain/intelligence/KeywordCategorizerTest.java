package com.iitsm.domain.intelligence;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class KeywordCategorizerTest {
    private final KeywordTextAnalysisService analyzer = new KeywordTextAnalysisService(
            new KeywordDictionary(
                    Map.of("network", new KeywordDictionary.TopicSource(
                            List.of("Network"), Map.of("vpn", 3.0))),
                    Map.of(5, List.of("all users")),
                    Map.of(5, List.of("urgent"))));
    private final AnalysisContext context = new AnalysisContext(
            List.of(new CategoryOption(1L, "Network"), new CategoryOption(2L, "Payment")),
            List.of(), List.of());

    @Test void keyword_match_selects_category_with_explainable_confidence() {
        var result = analyzer.suggestCategory("VPN disconnects", "Remote access fails", context);
        assertEquals(1L, result.categoryId());
        assertEquals("Network", result.categoryName());
        assertEquals(AnalysisSource.KEYWORD, result.source());
        assertTrue(result.confidence() >= 0.60);
        assertTrue(result.reason().toLowerCase().contains("vpn"));
    }

    @Test void unrelated_text_returns_no_category_and_intake_uses_count_cues() {
        var none = analyzer.suggestCategory("printer paper", "toner empty", context);
        assertNull(none.categoryId());
        assertEquals(0, none.confidence());
        var intake = analyzer.suggestIntake(
                "VPN is urgent and affects 100 users", context);
        assertEquals(1L, intake.categoryId());
        assertEquals(5, intake.impact());
        assertEquals(5, intake.urgency());
        assertEquals(AnalysisSource.KEYWORD, intake.source());
    }
}
