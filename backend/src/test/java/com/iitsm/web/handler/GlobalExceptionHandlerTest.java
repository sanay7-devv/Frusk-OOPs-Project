package com.iitsm.web.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.context.ApplicationEventPublisher;

import com.iitsm.application.config.ConfigService;
import com.iitsm.application.ratelimit.RateLimiter;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.web.dto.ErrorResponse;

class GlobalExceptionHandlerTest {

    @Test
    void validation_error_returns_the_standard_body_and_field_details() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(
                mock(ApplicationEventPublisher.class),
                Clock.fixed(Instant.parse("2026-11-21T12:00:00Z"), ZoneOffset.UTC),
                mock(RateLimiter.class),
                mock(ConfigService.class));
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/incidents");

        ResponseEntity<Object> response = handler.handleInputValidation(
                new InputValidationException("title", "is required"), request);

        assertEquals(400, response.getStatusCode().value());
        ErrorResponse body = assertInstanceOf(ErrorResponse.class, response.getBody());
        assertEquals("VALIDATION_FAILED", body.code());
        assertEquals("/api/v1/incidents", body.path());
        assertEquals(List.of(new ErrorResponse.FieldError("title", "is required")), body.fieldErrors());
    }
}
