package com.iitsm.application.graph;

import java.time.Instant;
import java.util.List;

/** The service graph, impact and status board objects (API Data Dictionary C.8, decision DEC-47 E1). */
public final class ServiceGraphViews {

    private ServiceGraphViews() {
    }

    /** A node of {@code GET /services/graph}. */
    public record GraphNode(Long id, String name, int criticality, long openIncidents, boolean hasOpenP1) {
    }

    /** An edge: {@code from} depends on {@code to}. */
    public record GraphEdge(Long from, Long to) {
    }

    public record ServiceGraphView(List<GraphNode> nodes, List<GraphEdge> edges) {
    }

    /** A service reached by a walk of the graph; distance 1 is a direct neighbour. */
    public record ReachedService(Long id, String name, int distance) {
    }

    /** {@code GET /services/{id}/impact}: every service that depends on this one, directly or through others. */
    public record ImpactView(Long serviceId, List<ReachedService> affected) {
    }

    /** Health of a service on the status board (E1). */
    public enum ServiceHealth {
        OUTAGE, DEGRADED, HEALTHY
    }

    /** Open incidents of one service, in all and per priority (UNSET ones count only in the total). */
    public record OpenCounts(long total, long P1, long P2, long P3, long P4) {
    }

    /**
     * One row of the status board.
     *
     * @param causedBy             upstream services in OUTAGE that make this one DEGRADED, nearest first
     * @param slaCompliancePercent share of judged incidents in the window that met their SLA; null when none was judged
     * @param slaJudged            how many incidents that percentage is based on
     */
    public record ServiceStatus(Long id, String name, int criticality, ServiceHealth status, String reason,
                                List<ReachedService> causedBy, OpenCounts open, Double slaCompliancePercent,
                                long slaJudged) {
    }

    /** {@code GET /services/status}: the board, worst first. */
    public record StatusBoard(String basis, String label, int windowDays, Instant generatedAt,
                              List<ServiceStatus> services) {
    }
}
