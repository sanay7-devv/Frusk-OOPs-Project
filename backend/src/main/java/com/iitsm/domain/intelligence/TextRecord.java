package com.iitsm.domain.intelligence;

/** One incident reduced to what similarity needs: an id, its title and its description. */
public record TextRecord(Long id, String title, String body) {
}
