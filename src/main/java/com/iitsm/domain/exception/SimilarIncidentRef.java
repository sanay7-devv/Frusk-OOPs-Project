package com.iitsm.domain.exception;

/** Lightweight reference to a similar incident, returned inside DUPLICATE_INCIDENT errors. */
public record SimilarIncidentRef(Long id, String code, String title, double similarity, String status) {
}
