package com.iitsm.domain.intelligence;

import java.time.Instant;

/** One line of an incident's thread: a comment or an audit entry. */
public record ThreadEntry(Kind kind, Instant at, String actor, String text, boolean internal) {

    public enum Kind { COMMENT, AUDIT }
}
