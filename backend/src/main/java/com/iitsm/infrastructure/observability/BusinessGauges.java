package com.iitsm.infrastructure.observability;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.iitsm.application.dashboard.DashboardService;
import com.iitsm.application.dashboard.DashboardViews.Counters;
import com.iitsm.application.report.ReportViews.LabelCount;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.MeterBinder;

/**
 * Gauges for what the desk looks like right now (A8, decision DEC-115): incidents by state, SLA violations on record
 * and open incidents by priority. They reuse the counters of the live dashboard (M13), so Grafana and the dashboard
 * can never disagree. A scrape answers from a snapshot at most ten seconds old, so a 5 second scrape interval does
 * not hit the database every time.
 */
@Component
public class BusinessGauges implements MeterBinder {

    private static final Duration MAX_AGE = Duration.ofSeconds(10);

    private final DashboardService dashboard;
    private final Clock clock;
    private Counters counters = new Counters(0, 0, 0, 0, 0);
    private Map<String, Long> byPriority = Map.of();
    private Instant takenAt = Instant.MIN;

    public BusinessGauges(DashboardService dashboard, Clock clock) {
        this.dashboard = dashboard;
        this.clock = clock;
    }

    @Override
    public void bindTo(MeterRegistry registry) {
        gauge(registry, "iitsm.incidents.all", "Every incident on record", () -> counters.total());
        gauge(registry, "iitsm.incidents.open", "Incidents not yet resolved", () -> counters.open());
        gauge(registry, "iitsm.incidents.critical", "Open P1 incidents", () -> counters.critical());
        gauge(registry, "iitsm.incidents.resolved.current", "Incidents resolved, verified or closed", () -> counters.resolved());
        gauge(registry, "iitsm.sla.violations.recorded", "SLA violations on record", () -> counters.slaViolations());
        for (String priority : List.of("P1", "P2", "P3", "P4")) {
            Gauge.builder("iitsm.incidents.open.by.priority", () -> {
                refresh();
                return byPriority.getOrDefault(priority, 0L);
            }).tag("priority", priority).description("Open incidents by priority").register(registry);
        }
    }

    private void gauge(MeterRegistry registry, String name, String description,
                       java.util.function.Supplier<Number> value) {
        Gauge.builder(name, () -> {
            refresh();
            return value.get();
        }).description(description).register(registry);
    }

    private synchronized void refresh() {
        Instant now = clock.instant();
        if (Duration.between(takenAt, now).compareTo(MAX_AGE) < 0) {
            return;
        }
        try {
            counters = dashboard.counters();
            byPriority = dashboard.openByPriority().stream()
                    .collect(Collectors.toMap(LabelCount::label, LabelCount::count, Long::sum));
            takenAt = now;
        } catch (RuntimeException ex) {
            // A scrape must never fail because the database is busy: the last snapshot stays.
        }
    }
}
