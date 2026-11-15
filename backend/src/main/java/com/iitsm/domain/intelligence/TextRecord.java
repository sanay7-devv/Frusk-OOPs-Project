package com.iitsm.domain.intelligence;

/**
 * One incident reduced to what similarity needs: an id, its title and its description, and when the embedding is
 * known its stored vector (null otherwise, then only TF-IDF can score it).
 */
public record TextRecord(Long id, String title, String body, double[] vector) {

    public TextRecord(Long id, String title, String body) {
        this(id, title, body, null);
    }
}
