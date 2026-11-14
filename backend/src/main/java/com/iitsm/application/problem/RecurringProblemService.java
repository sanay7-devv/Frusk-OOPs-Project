package com.iitsm.application.problem;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.incident.IncidentViewMapper;
import com.iitsm.application.incident.IncidentViews.IncidentSummary;
import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.application.problem.ProblemViews.RecurringView;
import com.iitsm.application.problem.ProblemViews.RecurringView.Kind;
import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.repository.IncidentRepository;

/**
 * The recurring-problem detector (E2, decision DEC-74): the brief's "difficulty identifying recurring problems".
 * Duplicates are the same failure reported several times within a day; a recurring problem is the same kind of
 * failure coming back over weeks after being fixed. Two signals, computed when a team lead asks (nothing is
 * stored, so the list can never be stale):
 * <ul>
 *   <li><b>REPEATED_FIX</b>: the same service and category resolved at least {@code recurring.min.count} times in
 *       {@code recurring.window.days}, among incidents not yet in a problem record;</li>
 *   <li><b>REPEATED_REOPEN</b>: an incident reopened at least {@code recurring.min.reopens} times.</li>
 * </ul>
 * A team lead turns a proposal into a problem record with {@code POST /problems}.
 */
@Service
public class RecurringProblemService {

    private final IncidentRepository incidents;
    private final IncidentViewMapper views;
    private final ConfigService config;
    private final Clock clock;

    public RecurringProblemService(IncidentRepository incidents, IncidentViewMapper views, ConfigService config,
                                   Clock clock) {
        this.incidents = incidents;
        this.views = views;
        this.config = config;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<RecurringView> proposals() {
        AppSettings settings = config.current();
        Instant since = clock.instant().minus(Duration.ofDays(settings.intValue(ConfigKey.RECURRING_WINDOW_DAYS)));
        int minCount = settings.intValue(ConfigKey.RECURRING_MIN_COUNT);
        int minReopens = settings.intValue(ConfigKey.RECURRING_MIN_REOPENS);
        IncidentViewMapper.SummaryBuilder builder = views.summaries();
        List<RecurringView> result = new ArrayList<>();

        Map<String, List<Incident>> groups = new LinkedHashMap<>();
        for (Incident resolved : incidents.findResolvedUngroupedSince(since)) {
            groups.computeIfAbsent(resolved.getService().getId() + ":" + resolved.getCategory().getId(),
                    k -> new ArrayList<>()).add(resolved);
        }
        for (List<Incident> group : groups.values()) {
            if (group.size() < minCount) {
                continue;
            }
            Incident first = group.get(0);
            result.add(new RecurringView(Kind.REPEATED_FIX,
                    new Ref(first.getService().getId(), first.getService().getName()),
                    new Ref(first.getCategory().getId(), first.getCategory().getName()), group.size(),
                    summaries(group, builder),
                    group.size() + " incidents on " + first.getService().getName() + " in category "
                            + first.getCategory().getName() + " were resolved in the last "
                            + settings.intValue(ConfigKey.RECURRING_WINDOW_DAYS) + " days: the cause may not be fixed"));
        }
        for (Incident reopened : incidents.findReopenedUngrouped(minReopens, since)) {
            result.add(new RecurringView(Kind.REPEATED_REOPEN,
                    new Ref(reopened.getService().getId(), reopened.getService().getName()),
                    reopened.getCategory() == null ? null
                            : new Ref(reopened.getCategory().getId(), reopened.getCategory().getName()),
                    reopened.getReopenCount(), List.of(builder.summary(reopened)),
                    reopened.getCode() + " was reopened " + reopened.getReopenCount() + " times"));
        }
        return result;
    }

    private static List<IncidentSummary> summaries(List<Incident> group, IncidentViewMapper.SummaryBuilder builder) {
        return group.stream().map(builder::summary).toList();
    }
}
