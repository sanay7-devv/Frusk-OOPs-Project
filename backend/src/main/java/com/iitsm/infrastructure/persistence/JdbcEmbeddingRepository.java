package com.iitsm.infrastructure.persistence;

import java.sql.Array;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.iitsm.domain.intelligence.TextRecord;
import com.iitsm.domain.repository.EmbeddingRepository;

/**
 * Plain JDBC for {@code incident_embeddings}: a DOUBLE PRECISION[] column needs no entity, and the incident
 * aggregate stays untouched.
 */
@Repository
class JdbcEmbeddingRepository implements EmbeddingRepository {

    private final JdbcTemplate jdbc;

    JdbcEmbeddingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void save(Long incidentId, double[] vector, String model, Instant now) {
        Double[] boxed = new Double[vector.length];
        for (int i = 0; i < vector.length; i++) {
            boxed[i] = vector[i];
        }
        jdbc.execute((java.sql.Connection con) -> {
            Array array = con.createArrayOf("float8", boxed);
            try (var statement = con.prepareStatement(
                    "INSERT INTO incident_embeddings(incident_id, vector, model, created_at) VALUES (?,?,?,?) "
                            + "ON CONFLICT (incident_id) DO UPDATE SET vector = EXCLUDED.vector, "
                            + "model = EXCLUDED.model, created_at = EXCLUDED.created_at")) {
                statement.setLong(1, incidentId);
                statement.setArray(2, array);
                statement.setString(3, model);
                statement.setTimestamp(4, Timestamp.from(now));
                return statement.executeUpdate();
            } finally {
                array.free();
            }
        });
    }

    @Override
    public Map<Long, double[]> findVectors(Collection<Long> incidentIds, String model) {
        Map<Long, double[]> found = new HashMap<>();
        if (incidentIds.isEmpty()) {
            return found;
        }
        Long[] ids = incidentIds.toArray(Long[]::new);
        jdbc.execute((java.sql.Connection con) -> {
            Array array = con.createArrayOf("bigint", ids);
            try (var statement = con.prepareStatement(
                    "SELECT incident_id, vector FROM incident_embeddings WHERE model = ? AND incident_id = ANY(?)")) {
                statement.setString(1, model);
                statement.setArray(2, array);
                try (var rows = statement.executeQuery()) {
                    while (rows.next()) {
                        found.put(rows.getLong(1), toPrimitive(rows.getArray(2)));
                    }
                }
            } finally {
                array.free();
            }
            return null;
        });
        return found;
    }

    @Override
    public Optional<double[]> findVector(Long incidentId, String model) {
        return Optional.ofNullable(findVectors(List.of(incidentId), model).get(incidentId));
    }

    @Override
    public Optional<TextRecord> findText(Long incidentId) {
        return jdbc.query("SELECT id, title, description FROM incidents WHERE id = ?",
                (rs, n) -> new TextRecord(rs.getLong(1), rs.getString(2), rs.getString(3)), incidentId)
                .stream().findFirst();
    }

    @Override
    public List<TextRecord> findPending(String model, int limit) {
        return jdbc.query("SELECT i.id, i.title, i.description FROM incidents i "
                        + "LEFT JOIN incident_embeddings e ON e.incident_id = i.id "
                        + "WHERE e.incident_id IS NULL OR e.model IS DISTINCT FROM ? "
                        + "ORDER BY i.created_at DESC, i.id DESC LIMIT ?",
                (rs, n) -> new TextRecord(rs.getLong(1), rs.getString(2), rs.getString(3)), model, limit);
    }

    @Override
    public long countEmbedded(String model) {
        Long count = jdbc.queryForObject("SELECT count(*) FROM incident_embeddings WHERE model = ?", Long.class, model);
        return count == null ? 0 : count;
    }

    @Override
    public long countIncidents() {
        Long count = jdbc.queryForObject("SELECT count(*) FROM incidents", Long.class);
        return count == null ? 0 : count;
    }

    private static double[] toPrimitive(Array array) throws java.sql.SQLException {
        try {
            Number[] numbers = (Number[]) array.getArray();
            double[] vector = new double[numbers.length];
            for (int i = 0; i < numbers.length; i++) {
                vector[i] = numbers[i].doubleValue();
            }
            return vector;
        } finally {
            array.free();
        }
    }
}
