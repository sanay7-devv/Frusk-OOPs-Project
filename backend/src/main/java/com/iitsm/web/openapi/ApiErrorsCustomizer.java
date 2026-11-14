package com.iitsm.web.openapi;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;

import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;

/**
 * Documents the error responses of every operation in the standard error body (API contract B.1): the codes declared
 * with {@link ApiErrors}, plus the ones every endpoint of its kind can return. Each status lists its codes with their
 * meaning and carries an example body.
 */
@Component
public class ApiErrorsCustomizer implements OperationCustomizer {

    public static final String ERROR_SCHEMA = "ErrorResponse";

    @Override
    public Operation customize(Operation operation, HandlerMethod handler) {
        Set<ErrorCode> codes = EnumSet.noneOf(ErrorCode.class);
        ApiErrors declared = handler.getMethodAnnotation(ApiErrors.class);
        if (declared != null) {
            codes.addAll(List.of(declared.value()));
        }
        boolean takesInput = operation.getRequestBody() != null
                || (operation.getParameters() != null && !operation.getParameters().isEmpty());
        if (takesInput) {
            codes.add(ErrorCode.VALIDATION_FAILED);
        }
        boolean isPublic = operation.getSecurity() != null && operation.getSecurity().isEmpty();
        if (!isPublic) {
            codes.add(ErrorCode.TOKEN_INVALID);
            codes.add(ErrorCode.TOKEN_EXPIRED);
        }
        if (AnnotatedElementUtils.hasAnnotation(handler.getMethod(), PreAuthorize.class)
                || AnnotatedElementUtils.hasAnnotation(handler.getBeanType(), PreAuthorize.class)) {
            codes.add(ErrorCode.UNAUTHORIZED_OPERATION);
        }
        codes.add(ErrorCode.INTERNAL_ERROR);
        codes.add(ErrorCode.SERVICE_UNAVAILABLE); // any operation may meet a database outage (M14)

        Map<Integer, List<ErrorCode>> byStatus = new TreeMap<>();
        codes.forEach(code -> byStatus.computeIfAbsent(code.status(), s -> new ArrayList<>()).add(code));

        ApiResponses responses = operation.getResponses() == null ? new ApiResponses() : operation.getResponses();
        byStatus.forEach((status, list) -> responses.addApiResponse(String.valueOf(status), response(status, list)));
        operation.setResponses(responses);
        return operation;
    }

    private static ApiResponse response(int status, List<ErrorCode> codes) {
        StringBuilder description = new StringBuilder();
        for (ErrorCode code : codes) {
            description.append(description.isEmpty() ? "" : "\n").append("- `").append(code.name()).append("`: ")
                    .append(code.meaning());
        }
        ErrorCode first = codes.get(0);
        Map<String, Object> example = new LinkedHashMap<>();
        example.put("timestamp", "2026-11-06T09:21:00Z");
        example.put("status", status);
        example.put("code", first.name());
        example.put("message", first.meaning() + ".");
        example.put("path", "/api/v1/...");
        example.put("fieldErrors", first == ErrorCode.VALIDATION_FAILED
                ? List.of(Map.of("field", "impact", "message", "must be between 1 and 5"))
                : List.of());
        MediaType json = new MediaType()
                .schema(new Schema<>().$ref("#/components/schemas/" + ERROR_SCHEMA))
                .example(example);
        return new ApiResponse().description(description.toString())
                .content(new Content().addMediaType("application/json", json));
    }
}
