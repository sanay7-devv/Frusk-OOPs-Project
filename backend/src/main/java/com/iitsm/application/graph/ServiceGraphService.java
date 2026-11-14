package com.iitsm.application.graph;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.graph.ServiceGraphViews.GraphEdge;
import com.iitsm.application.graph.ServiceGraphViews.GraphNode;
import com.iitsm.application.graph.ServiceGraphViews.ImpactView;
import com.iitsm.application.graph.ServiceGraphViews.OpenCounts;
import com.iitsm.application.graph.ServiceGraphViews.ReachedService;
import com.iitsm.application.graph.ServiceGraphViews.ServiceGraphView;
import com.iitsm.application.graph.ServiceGraphViews.ServiceHealth;
import com.iitsm.application.graph.ServiceGraphViews.ServiceStatus;
import com.iitsm.application.graph.ServiceGraphViews.StatusBoard;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.exception.ServiceNotFoundException;
import com.iitsm.domain.priority.Priority;
import com.iitsm.domain.report.ReportRows.SlaCompliance;
import com.iitsm.domain.report.ReportScope;
import com.iitsm.domain.repository.DashboardRepository;
import com.iitsm.domain.repository.DashboardRepository.OpenCount;
import com.iitsm.domain.repository.ItServiceRepository;
import com.iitsm.domain.repository.ReportRepository;
import com.iitsm.domain.service.ItService;
import com.iitsm.domain.service.ServiceGraph;

/**
 * The service dependency graph, impact analysis and the service status board (handbook 2.5 M13, decisions DEC-16,
 * DEC-42, DEC-47 E1). The walks are done by the plain domain class {@link ServiceGraph}; this service only loads the
 * active services and the open-incident counts and shapes the answers. Read by every logged-in user: it shows
 * services and counts, never an incident.
 */
@Service
public class ServiceGraphService {

    static final String BASIS = "REPORTED_INCIDENTS";
    static final String LABEL = "Based on reported incidents";

    private final ItServiceRepository services;
    private final DashboardRepository dashboard;
    private final ReportRepository reports;
    private final ConfigService config;
    private final Clock clock;

    public ServiceGraphService(ItServiceRepository services, DashboardRepository dashboard,
                               ReportRepository reports, ConfigService config, Clock clock) {
        this.services = services;
        this.dashboard = dashboard;
        this.reports = reports;
        this.config = config;
        this.clock = clock;
    }

    /** Active services as nodes with their open incidents, and the dependency edges between them. */
    @Transactional(readOnly = true)
    public ServiceGraphView graph() {
        List<ItService> active = services.findByActiveTrueOrderByNameAsc();
        ServiceGraph graph = ServiceGraph.fromServices(active);
        Map<Long, OpenCounts> open = openCounts();
        List<GraphNode> nodes = active.stream().map(s -> {
            OpenCounts c = open.getOrDefault(s.getId(), NONE);
            return new GraphNode(s.getId(), s.getName(), s.getCriticality(), c.total(), c.P1() > 0);
        }).toList();
        List<GraphEdge> edges = graph.edges().stream().map(e -> new GraphEdge(e.from(), e.to())).toList();
        return new ServiceGraphView(nodes, edges);
    }

    /**
     * Every active service that depends on {@code serviceId}, directly (distance 1) or through others. A switched-off
     * service can still be asked about; it then answers with its active dependants.
     */
    @Transactional(readOnly = true)
    public ImpactView impact(Long serviceId) {
        ItService target = services.findById(serviceId).orElseThrow(() -> new ServiceNotFoundException(serviceId));
        List<ItService> nodes = new ArrayList<>(services.findByActiveTrueOrderByNameAsc());
        if (!target.isActive()) {
            nodes.add(target);
        }
        Map<Long, String> names = names(nodes);
        List<ReachedService> affected = ServiceGraph.fromServices(nodes).impactOf(serviceId).stream()
                .map(r -> new ReachedService(r.serviceId(), names.get(r.serviceId()), r.distance())).toList();
        return new ImpactView(serviceId, affected);
    }

    /**
     * The status board (E1). OUTAGE: an open P1 on the service. DEGRADED: an open P2, or an OUTAGE on any service it
     * depends on, directly or through others. Otherwise HEALTHY. SLA compliance covers incidents created in the last
     * {@code status.sla.window.days} days, with the definitions of the SLA compliance report.
     */
    @Transactional(readOnly = true)
    public StatusBoard status() {
        List<ItService> active = services.findByActiveTrueOrderByNameAsc();
        ServiceGraph graph = ServiceGraph.fromServices(active);
        Map<Long, String> names = names(active);
        Map<Long, OpenCounts> open = openCounts();

        int windowDays = config.current().intValue(ConfigKey.STATUS_SLA_WINDOW_DAYS);
        Instant now = clock.instant();
        Map<String, SlaCompliance> slaByName = new HashMap<>();
        for (SlaCompliance row : reports.slaCompliance(
                new ReportScope(null, now.minus(Duration.ofDays(windowDays)), null), "SERVICE")) {
            slaByName.put(row.label(), row);
        }

        List<ServiceStatus> rows = new ArrayList<>();
        for (ItService service : active) {
            OpenCounts counts = open.getOrDefault(service.getId(), NONE);
            List<ReachedService> causedBy = graph.upstreamOf(service.getId()).stream()
                    .filter(r -> open.getOrDefault(r.serviceId(), NONE).P1() > 0)
                    .map(r -> new ReachedService(r.serviceId(), names.get(r.serviceId()), r.distance()))
                    .toList();
            ServiceHealth health;
            String reason;
            if (counts.P1() > 0) {
                health = ServiceHealth.OUTAGE;
                reason = plural(counts.P1(), "open P1 incident") + " on this service";
            } else if (counts.P2() > 0) {
                health = ServiceHealth.DEGRADED;
                reason = plural(counts.P2(), "open P2 incident") + " on this service";
            } else if (!causedBy.isEmpty()) {
                health = ServiceHealth.DEGRADED;
                reason = "Depends on " + causedBy.get(0).name() + " (outage)";
            } else {
                health = ServiceHealth.HEALTHY;
                reason = "No open P1 or P2 incident here or upstream";
            }
            SlaCompliance sla = slaByName.get(service.getName());
            rows.add(new ServiceStatus(service.getId(), service.getName(), service.getCriticality(), health, reason,
                    causedBy, counts, sla == null ? null : Math.round(sla.compliancePercent() * 10) / 10.0,
                    sla == null ? 0 : sla.total()));
        }
        rows.sort(Comparator.comparing(ServiceStatus::status).thenComparing(ServiceStatus::name));
        return new StatusBoard(BASIS, LABEL, windowDays, now, rows);
    }

    private static final OpenCounts NONE = new OpenCounts(0, 0, 0, 0, 0);

    private Map<Long, OpenCounts> openCounts() {
        Map<Long, long[]> byService = new HashMap<>();
        for (OpenCount c : dashboard.openIncidentsByServiceAndPriority()) {
            long[] slots = byService.computeIfAbsent(c.serviceId(), k -> new long[5]);
            slots[0] += c.count();
            if (c.priority() != null) {
                slots[c.priority().ordinal() + 1] += c.count();
            }
        }
        Map<Long, OpenCounts> result = new HashMap<>();
        byService.forEach((id, s) -> result.put(id, new OpenCounts(s[0], s[1], s[2], s[3], s[4])));
        return result;
    }

    private static Map<Long, String> names(List<ItService> list) {
        Map<Long, String> names = new LinkedHashMap<>();
        list.forEach(s -> names.put(s.getId(), s.getName()));
        return names;
    }

    private static String plural(long n, String noun) {
        return n + " " + noun + (n == 1 ? "" : "s");
    }

    static {
        // OpenCounts slots rely on P1..P4 being declared in this order
        if (Priority.P1.ordinal() != 0 || Priority.P4.ordinal() != 3) {
            throw new IllegalStateException("Priority order changed");
        }
    }
}
