package com.iitsm.domain.intelligence;

/** A candidate that resembles the query text, with its cosine similarity from 0 to 1. */
public record SimilarMatch(Long id, double similarity) {
}
