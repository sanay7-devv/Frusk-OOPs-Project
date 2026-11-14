package com.iitsm.domain.service;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * The service dependency graph as plain data (decisions DEC-16 and DEC-42: traversal in Java with a visited set).
 * An edge {@code from -> to} means "from depends on to" (Payment depends on Database). The graph is a snapshot of
 * ids, built once per request, so the walks never touch the database or lazy collections.
 * <p>
 * Three walks, all breadth-first so the distance is the shortest number of edges:
 * <ul>
 *   <li>{@link #impactOf(Long)}: downstream, the services that need this one (what breaks if it fails);</li>
 *   <li>{@link #upstreamOf(Long)}: what this service needs, directly or through others;</li>
 *   <li>{@link #commonUpstream(Collection)}: the services every given service needs (root cause, DEC-44 S2).</li>
 * </ul>
 * The graph is cycle-free (enforced by {@link ItService#replaceDependencies}); the visited set still guards every
 * walk, so a cycle written straight into the database cannot make it loop.
 */
public final class ServiceGraph {

    /** A service reached by a walk, and its shortest distance in edges from the start. */
    public record Reach(Long serviceId, int distance) {
    }

    /** An edge: {@code from} depends on {@code to}. */
    public record Edge(Long from, Long to) {
    }

    /**
     * A service every affected service depends on (or is one of them, at distance 0).
     *
     * @param distances   shortest distance from each affected service to this one, keyed by affected service id
     * @param maxDistance the largest of those distances; the ranking key
     */
    public record CommonUpstream(Long serviceId, Map<Long, Integer> distances, int maxDistance, int totalDistance) {
    }

    /** "id depends on these ids". */
    private final Map<Long, Set<Long>> dependsOn;
    /** Reverse edges: "these ids depend on id". */
    private final Map<Long, Set<Long>> neededBy;

    private ServiceGraph(Map<Long, Set<Long>> dependsOn) {
        this.dependsOn = new TreeMap<>();
        this.neededBy = new TreeMap<>();
        dependsOn.forEach((from, targets) -> {
            this.dependsOn.computeIfAbsent(from, k -> new TreeSet<>());
            this.neededBy.computeIfAbsent(from, k -> new TreeSet<>());
            for (Long to : targets) {
                this.dependsOn.get(from).add(to);
                this.dependsOn.computeIfAbsent(to, k -> new TreeSet<>());
                this.neededBy.computeIfAbsent(to, k -> new TreeSet<>()).add(from);
            }
        });
    }

    /**
     * Builds the graph from ids: every key is a service, its value the ids it depends on. Targets that are not keys
     * are added as nodes without dependencies.
     */
    public static ServiceGraph of(Map<Long, ? extends Collection<Long>> dependsOn) {
        Map<Long, Set<Long>> copy = new HashMap<>();
        dependsOn.forEach((from, targets) -> copy.put(from, new TreeSet<>(targets)));
        return new ServiceGraph(copy);
    }

    /**
     * Builds the graph from services. Only edges between the given services are kept, so passing the active services
     * leaves out edges to switched-off ones.
     */
    public static ServiceGraph fromServices(Collection<ItService> services) {
        Set<Long> ids = new TreeSet<>();
        services.forEach(s -> ids.add(s.getId()));
        Map<Long, Set<Long>> edges = new HashMap<>();
        for (ItService service : services) {
            Set<Long> targets = new TreeSet<>();
            for (ItService dependency : service.getDependencies()) {
                if (ids.contains(dependency.getId())) {
                    targets.add(dependency.getId());
                }
            }
            edges.put(service.getId(), targets);
        }
        return new ServiceGraph(edges);
    }

    public Set<Long> nodes() {
        return Set.copyOf(dependsOn.keySet());
    }

    public boolean contains(Long serviceId) {
        return dependsOn.containsKey(serviceId);
    }

    /** The direct dependencies of a service ("serviceId depends on these"); empty for an unknown id. */
    public Set<Long> directDependencies(Long serviceId) {
        return Set.copyOf(dependsOn.getOrDefault(serviceId, Set.of()));
    }

    /** Every edge (from depends on to), ordered by from then to. */
    public List<Edge> edges() {
        List<Edge> result = new ArrayList<>();
        dependsOn.forEach((from, targets) -> targets.forEach(to -> result.add(new Edge(from, to))));
        return List.copyOf(result);
    }

    /**
     * Downstream impact: the services that depend on {@code serviceId}, directly (distance 1) or through others.
     * The start service is not in the result. Ordered by distance, then id.
     */
    public List<Reach> impactOf(Long serviceId) {
        return walk(serviceId, neededBy);
    }

    /**
     * Upstream: the services {@code serviceId} depends on, directly (distance 1) or through others. The start service
     * is not in the result. Ordered by distance, then id.
     */
    public List<Reach> upstreamOf(Long serviceId) {
        return walk(serviceId, dependsOn);
    }

    /**
     * The services that every one of {@code serviceIds} needs, the probable root cause when they fail together
     * (DEC-44 S2). Each affected service counts as its own upstream at distance 0, so when Payment depends on
     * Database and both are affected, Database itself is a candidate. Unknown ids are ignored; fewer than one known
     * id gives an empty list.
     * <p>
     * Ranking, closest first: the largest distance from any affected service (smaller wins), then the sum of the
     * distances, then the id. Example: Payment and Portal both depend on Auth, Auth depends on Database. Common
     * upstream = Auth (max 1) then Database (max 2); the root cause is Auth.
     */
    public List<CommonUpstream> commonUpstream(Collection<Long> serviceIds) {
        Set<Long> affected = new TreeSet<>();
        for (Long id : serviceIds) {
            if (contains(id)) {
                affected.add(id);
            }
        }
        if (affected.isEmpty()) {
            return List.of();
        }
        Map<Long, Map<Long, Integer>> distancesByCandidate = null;
        for (Long id : affected) {
            Map<Long, Integer> reach = new HashMap<>();
            reach.put(id, 0);
            upstreamOf(id).forEach(r -> reach.put(r.serviceId(), r.distance()));
            if (distancesByCandidate == null) {
                distancesByCandidate = new HashMap<>();
                for (Map.Entry<Long, Integer> e : reach.entrySet()) {
                    Map<Long, Integer> perAffected = new LinkedHashMap<>();
                    perAffected.put(id, e.getValue());
                    distancesByCandidate.put(e.getKey(), perAffected);
                }
            } else {
                distancesByCandidate.keySet().retainAll(reach.keySet());
                for (Map.Entry<Long, Map<Long, Integer>> e : distancesByCandidate.entrySet()) {
                    e.getValue().put(id, reach.get(e.getKey()));
                }
            }
        }
        List<CommonUpstream> result = new ArrayList<>();
        distancesByCandidate.forEach((candidate, distances) -> {
            int max = distances.values().stream().mapToInt(Integer::intValue).max().orElse(0);
            int total = distances.values().stream().mapToInt(Integer::intValue).sum();
            result.add(new CommonUpstream(candidate, Map.copyOf(distances), max, total));
        });
        result.sort(Comparator.comparingInt(CommonUpstream::maxDistance)
                .thenComparingInt(CommonUpstream::totalDistance)
                .thenComparing(CommonUpstream::serviceId));
        return List.copyOf(result);
    }

    /** Breadth-first walk with a visited set; the start is excluded. */
    private List<Reach> walk(Long start, Map<Long, Set<Long>> adjacency) {
        if (!adjacency.containsKey(start)) {
            return List.of();
        }
        Map<Long, Integer> distance = new LinkedHashMap<>();
        distance.put(start, 0);
        Deque<Long> queue = new ArrayDeque<>();
        queue.add(start);
        while (!queue.isEmpty()) {
            Long current = queue.poll();
            int next = distance.get(current) + 1;
            for (Long neighbour : adjacency.getOrDefault(current, Set.of())) {
                if (!distance.containsKey(neighbour)) {
                    distance.put(neighbour, next);
                    queue.add(neighbour);
                }
            }
        }
        distance.remove(start);
        List<Reach> result = new ArrayList<>();
        distance.forEach((id, d) -> result.add(new Reach(id, d)));
        result.sort(Comparator.comparingInt(Reach::distance).thenComparing(Reach::serviceId));
        return List.copyOf(result);
    }
}
