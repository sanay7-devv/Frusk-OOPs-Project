package com.iitsm.web.openapi;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Map;

import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import io.swagger.v3.core.util.Json31;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.media.Schema;

/**
 * Adds the agreed but not yet built endpoints (classpath openapi/planned-endpoints.json, from API contract Appendices
 * B and C) to the published contract under the tag "Planned", so the frontend and testing teams can work against
 * the whole API now. A planned operation never replaces an implemented one: once a module is built, its controller
 * documents itself and the planned entry should be deleted from the file.
 */
@Component
public class PlannedEndpointsCustomizer implements OpenApiCustomizer {

    private static final String RESOURCE = "openapi/planned-endpoints.json";

    private final OpenAPI planned;

    public PlannedEndpointsCustomizer() {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            this.planned = Json31.mapper().readValue(in, OpenAPI.class);
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot read " + RESOURCE, ex);
        }
    }

    @Override
    public void customise(OpenAPI openApi) {
        planned.getPaths().forEach((path, plannedItem) -> {
            PathItem live = openApi.getPaths().get(path);
            if (live == null) {
                openApi.getPaths().addPathItem(path, plannedItem);
                return;
            }
            plannedItem.readOperationsMap().forEach((method, operation) -> {
                if (!live.readOperationsMap().containsKey(method)) {
                    live.operation(method, operation);
                }
            });
        });
        Map<String, Schema> schemas = openApi.getComponents().getSchemas();
        planned.getComponents().getSchemas().forEach(schemas::putIfAbsent);
    }
}
