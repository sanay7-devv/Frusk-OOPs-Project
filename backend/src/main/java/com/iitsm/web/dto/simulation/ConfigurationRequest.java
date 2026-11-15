package com.iitsm.web.dto.simulation;

import java.util.LinkedHashMap;
import java.util.Map;

import com.iitsm.application.simulation.SimulatorService.ConfigurationSpec;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * One configuration to try or apply. Anything left out keeps the live setting.
 *
 * @param strategy    COMPOSITE, SKILL, LOAD, ROUND_ROBIN or EXPERIENCE_PRIORITY
 * @param technicians use only the first N technicians (by id); fewer people shows what a shortage would do
 */
public record ConfigurationRequest(
        @Size(max = 60) String name,
        @Size(max = 30) String strategy,
        @Valid WeightsRequest weights,
        @Min(1) @Max(50) Integer technicians) {

    public ConfigurationSpec toSpec() {
        Map<String, Double> map = null;
        if (weights != null) {
            map = new LinkedHashMap<>();
            put(map, "skill", weights.skill());
            put(map, "load", weights.load());
            put(map, "experience", weights.experience());
            put(map, "priorityFit", weights.priorityFit());
            put(map, "familiarity", weights.familiarity());
        }
        return new ConfigurationSpec(name, strategy, map, technicians);
    }

    private static void put(Map<String, Double> map, String key, Double value) {
        if (value != null) {
            map.put(key, value);
        }
    }
}
