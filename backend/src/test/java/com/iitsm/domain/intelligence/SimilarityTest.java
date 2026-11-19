package com.iitsm.domain.intelligence;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class SimilarityTest {
    @Test void tokenizer_normalizes_repeated_forms_and_ignores_filler() {
        assertEquals(List.of("vpn", "disconnect", "disconnect", "disconnect"),
                Tokenizer.tokens("The VPN disconnects, disconnected, disconnecting!"));
    }

    @Test void cosine_is_symmetric_and_bounded_for_identical_unrelated_and_empty_text() {
        var model = TfIdfModel.fromCorpus(List.of("vpn tunnel failure", "payment gateway failure"));
        var vpn = model.vectorize("VPN tunnel", "failure");
        var same = model.vectorize("VPN tunnel", "failure");
        var unrelated = model.vectorize("printer", "toner");
        var empty = model.vectorize("the and", "");
        assertEquals(1.0, TfIdfModel.cosine(vpn, same), 1e-9);
        assertEquals(0.0, TfIdfModel.cosine(vpn, unrelated), 1e-9);
        assertEquals(0.0, TfIdfModel.cosine(vpn, empty), 1e-9);
        assertEquals(TfIdfModel.cosine(vpn, unrelated),
                TfIdfModel.cosine(unrelated, vpn), 1e-9);
    }

    @Test void title_terms_receive_more_weight_than_body_terms() {
        var model = TfIdfModel.fromCorpus(List.of("vpn payment", "vpn service"));
        var vector = model.vectorize("payment", "vpn");
        assertTrue(vector.weights().get("payment") > vector.weights().get("vpn"));
        assertEquals(List.of("vpn", "payment"),
                TfIdfModel.distinctTokens("VPN vpn payment"));
    }
}
