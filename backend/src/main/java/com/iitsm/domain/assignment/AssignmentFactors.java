package com.iitsm.domain.assignment;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.user.Skill;
import com.iitsm.domain.user.TechnicianProfile;

/**
 * The five things assignment looks at, each scored from 0 (worst) to 1 (best), plus the human-readable reasons
 * shown to admins (decision DEC-28 to DEC-30):
 * <ul>
 *   <li><b>skill</b>: 70% the best proficiency among the category's required skills, 30% the share of required
 *       skills held (rewards a specialist, prefers someone who covers everything);</li>
 *   <li><b>load</b>: 1 - current load / max load;</li>
 *   <li><b>experience</b>: level / 5;</li>
 *   <li><b>priorityFit</b>: P1 and P2 go to seniors (level 4-5 score 1); P3 and P4 prefer levels 1-3, keeping
 *       seniors free for critical work;</li>
 *   <li><b>familiarity</b>: incidents on the same service resolved recently, against a target (default 5 in 90
 *       days), from the course brief's "previous experience with the affected service".</li>
 * </ul>
 */
public record AssignmentFactors(double skill, double load, double experience, double priorityFit,
                                double familiarity, List<String> reasons) {

    private static final double BEST_SKILL_SHARE = 0.7;
    private static final double COVERAGE_SHARE = 0.3;

    public AssignmentFactors {
        reasons = List.copyOf(reasons);
    }

    public static AssignmentFactors of(Incident incident, TechnicianCandidate candidate, AppSettings settings) {
        TechnicianProfile profile = candidate.profile();
        List<String> reasons = new ArrayList<>();

        double skill = skillScore(incident, profile, reasons);

        double load = Math.max(0, 1 - (double) candidate.currentLoad() / profile.getMaxLoad());
        reasons.add("Load " + candidate.currentLoad() + "/" + profile.getMaxLoad());

        int level = profile.getExperienceLevel();
        double experience = level / 5.0;
        reasons.add("Experience level " + level + (level >= 4 ? " (senior)" : ""));

        double priorityFit = priorityFit(incident.getPriority(), level);

        int target = settings.intValue(ConfigKey.ASSIGNMENT_FAMILIARITY_TARGET);
        int windowDays = settings.intValue(ConfigKey.ASSIGNMENT_FAMILIARITY_WINDOW_DAYS);
        double familiarity = Math.min(1.0, (double) candidate.recentServiceFixes() / target);
        String service = incident.getService().getName();
        reasons.add(candidate.recentServiceFixes() == 0
                ? "No " + service + " incidents resolved in the last " + windowDays + " days"
                : "Resolved " + candidate.recentServiceFixes() + " " + service + " incident"
                        + (candidate.recentServiceFixes() == 1 ? "" : "s") + " in the last " + windowDays + " days");

        return new AssignmentFactors(skill, load, experience, priorityFit, familiarity, reasons);
    }

    /** As a map, for the per-factor bars in the recommendations response. */
    public Map<String, Double> asMap() {
        return Map.of("skill", round(skill), "load", round(load), "experience", round(experience),
                "priorityFit", round(priorityFit), "familiarity", round(familiarity));
    }

    private static double skillScore(Incident incident, TechnicianProfile profile, List<String> reasons) {
        Set<Skill> required = incident.getCategory() == null ? Set.of() : incident.getCategory().getRequiredSkills();
        if (required.isEmpty()) {
            reasons.add("No specific skill required");
            return 1.0;
        }
        int best = 0;
        int held = 0;
        List<String> parts = new ArrayList<>();
        for (Skill skill : required.stream().sorted(Comparator.comparing(Skill::getName)).toList()) {
            Optional<Integer> level = profile.getSkills().proficiencyIn(skill);
            if (level.isPresent()) {
                best = Math.max(best, level.get());
                held++;
                parts.add(skill.getName() + " " + level.get() + "/5");
            } else {
                parts.add(skill.getName() + " missing");
            }
        }
        reasons.add(String.join(", ", parts));
        return BEST_SKILL_SHARE * best / 5.0 + COVERAGE_SHARE * held / required.size();
    }

    private static double priorityFit(Priority priority, int level) {
        boolean critical = priority == Priority.P1 || priority == Priority.P2;
        if (critical) {
            return level >= 4 ? 1.0 : level / 5.0;
        }
        return level <= 3 ? 1.0 : (6 - level) / 5.0;
    }

    private static double round(double value) {
        return Math.round(value * 100) / 100.0;
    }
}
