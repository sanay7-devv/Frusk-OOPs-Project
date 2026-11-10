package com.iitsm.domain.assignment;

/** A candidate with their factors and the score the active strategy gave them (0 to 1). */
public record ScoredCandidate(TechnicianCandidate candidate, AssignmentFactors factors, double score) {

    /** 0 to 100, as shown to users. */
    public int percent() {
        return (int) Math.round(score * 100);
    }
}
