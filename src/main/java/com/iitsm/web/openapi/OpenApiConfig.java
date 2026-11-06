package com.iitsm.web.openapi;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.iitsm.web.dto.ErrorResponse;

import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;

/**
 * The API contract (handbook: the Backend Lead publishes it; the generated file is the final truth). Implemented
 * endpoints come from the controllers; endpoints of later modules are added by {@code PlannedEndpointsCustomizer}
 * and tagged "Planned". The exported file lives in docs/openapi.
 */
@Configuration
public class OpenApiConfig {

    public static final String BEARER_SCHEME = "bearerAuth";
    public static final String CONTRACT_VERSION = "1.0.0-m6";

    private static final String DESCRIPTION = """
            Intelligent IT Service Management and Incident Resolution System: REST API contract.

            **Conventions** (API Data Dictionary B.1, C.1)
            - Base path `/api/v1`, JSON bodies, camelCase fields, enum values in UPPER_SNAKE_CASE.
            - Times are ISO-8601 UTC strings; durations carry their unit in the name (`responseMinutes`).
            - Send `Authorization: Bearer <accessToken>` on every endpoint except register, login and refresh.
              Access tokens live 15 minutes; refresh before expiry (refresh tokens rotate on every use).
            - Every failure uses one body: `{timestamp, status, code, message, path, fieldErrors}`; each operation
              lists the codes it can return. `fieldErrors` is empty except for `VALIDATION_FAILED`.
            - Paged lists accept `page` (from 0), `size` (default 20, max 100), `sort` (`field,asc|desc`) and return
              `{items, page, size, totalItems, totalPages}`.
            - Incident details include `allowedActions`: show exactly these buttons, never re-implement the rules.
            - Every response carries an `X-Request-Id` header; quote it when reporting a problem.

            **Status of each endpoint**
            - Endpoints under the tag **Planned** are part of the agreed contract but not built yet; each says in which
              module it arrives (`x-module`). Everything else is implemented and tested.
            - Additions to the original contract (Appendices B and C) are marked `x-contract-addition: true` and
              listed in docs/openapi/README.md.

            **Real-time** (module M13, planned): STOMP over WebSocket at `/ws` with the access token; topics
            `/user/queue/notifications` (Notification) and `/topic/dashboard` (DashboardEvent and counters).
            """;

    @Bean
    OpenAPI iitsmOpenApi() {
        Components components = new Components().addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT"));
        // The standard error body: no controller returns it, so it is registered explicitly
        ModelConverters.getInstance().readAll(ErrorResponse.class).forEach(components::addSchemas);

        return new OpenAPI()
                .info(new Info()
                        .title("I-ITSM API")
                        .version(CONTRACT_VERSION)
                        .description(DESCRIPTION))
                .servers(List.of(new Server().url("http://localhost:8080").description("Local backend")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(components)
                .tags(List.of(
                        tag("Auth", "Register, log in, refresh and revoke tokens, current user (M2)"),
                        tag("Incidents", "Report, track and work on incidents; lifecycle actions, comments, "
                                + "recommendations (M4, M5, M6)"),
                        tag("Technicians", "Technician list, my workload, my queue, my availability (M6)"),
                        tag("Catalog", "Active services and categories for every logged-in user (M3)"),
                        tag("Admin: users and technicians", "Users, roles, technician profiles and skills (M2, M6)"),
                        tag("Admin: catalog", "Services, dependencies, categories, skills (M3)"),
                        tag("Admin: SLA and escalation", "SLA and escalation policies (M3)"),
                        tag("Admin: configuration", "Live settings: strategies, weights, thresholds (M3)"),
                        tag("Planned", "Agreed contract, not built yet; x-module says which module delivers it")));
    }

    private static Tag tag(String name, String description) {
        return new Tag().name(name).description(description);
    }
}
