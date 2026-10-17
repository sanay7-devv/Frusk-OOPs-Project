package com.iitsm.domain.exception;

import java.util.List;

public class DuplicateIncidentException extends ItsmException {

    private final List<SimilarIncidentRef> similar;

    public DuplicateIncidentException(List<SimilarIncidentRef> similar) {
        super("DUPLICATE_INCIDENT", 409, "A similar open incident already exists.");
        this.similar = List.copyOf(similar);
    }

    public List<SimilarIncidentRef> getSimilar() {
        return similar;
    }
}
