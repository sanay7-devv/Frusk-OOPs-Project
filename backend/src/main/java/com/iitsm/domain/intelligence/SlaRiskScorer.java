package com.iitsm.domain.intelligence;

import java.util.List;

/**
 * The SLA risk heuristic of handbook 1.7 (no machine learning): a score from 0 to 1 built from four factors, each
 * a ratio from 0 to 1 multiplied by its weight, so the factors add up to the score and the response can show how
 * much each one contributed.
 * <ul>
 *   <li>elapsed: how much of the resolution time has run (default weight 0.50);</li>
 *   <li>load: how full the assigned technician's workload is, 1.0 if nobody is assigned (0.20);</li>
 *   <li>priority: P1 1.0, P2 0.75, P3 0.5, P4 0.25 (0.15);</li>
 *   <li>history: how long similar past incidents took compared with the SLA target (0.15).</li>
 * </ul>
 * Pure and deterministic; the weights and the flag threshold come from app_config through the caller.
 */
public final class SlaRiskScorer {

    /** LOW, MEDIUM or HIGH (API Data Dictionary C.6); HIGH means flagged "at risk". */
    public enum Level { LOW, MEDIUM, HIGH }

    /** One factor of the score: its name, what it added to the score (weight times ratio) and why. */
    public record Factor(String name, double contribution, String detail) {
    }

    public record Score(double score, Level level, List<Factor> factors) {

        public boolean atRisk() {
            return level == Level.HIGH;
        }
    }

    /** The four ratios, each already from 0 to 1, with a sentence explaining each. */
    public record Inputs(double elapsed, String elapsedDetail, double load, String loadDetail, double priority,
                         String priorityDetail, double history, String historyDetail) {
    }

    public record Weights(double elapsed, double load, double priority, double history) {
    }

    /** MEDIUM starts this far below the flag threshold (0.40 when the threshold is 0.70, as in the contract). */
    private static final double MEDIUM_BAND = 0.30;

    private SlaRiskScorer() {
    }

    public static Score score(Inputs in, Weights w, double threshold) {
        List<Factor> factors = List.of(
                new Factor("elapsedTime", round(w.elapsed() * clamp(in.elapsed())), in.elapsedDetail()),
                new Factor("technicianLoad", round(w.load() * clamp(in.load())), in.loadDetail()),
                new Factor("priority", round(w.priority() * clamp(in.priority())), in.priorityDetail()),
                new Factor("similarHistory", round(w.history() * clamp(in.history())), in.historyDetail()));
        double total = round(Math.min(1.0, factors.stream().mapToDouble(Factor::contribution).sum()));
        return new Score(total, levelOf(total, threshold), factors);
    }

    /** The score of an incident that no longer has a running clock: nothing to be at risk of. */
    public static Score finished(String why) {
        return new Score(0, Level.LOW, List.of(new Factor("none", 0, why)));
    }

    public static Level levelOf(double score, double threshold) {
        if (score >= threshold) {
            return Level.HIGH;
        }
        return score >= Math.max(0, threshold - MEDIUM_BAND) ? Level.MEDIUM : Level.LOW;
    }

    /** Priority ratio of the handbook: P1 1.0 down to P4 0.25 ({@code ordinal} is 0 for P1). */
    public static double priorityRatio(int priorityOrdinal) {
        return (4 - priorityOrdinal) / 4.0;
    }

    private static double clamp(double ratio) {
        return Math.max(0, Math.min(1, ratio));
    }

    private static double round(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }
}
