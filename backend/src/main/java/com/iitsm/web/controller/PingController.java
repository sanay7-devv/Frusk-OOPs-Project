package com.iitsm.web.controller;

import java.time.Instant;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Ultra-lightweight endpoint for frontend-backend real-time latency probing and heartbeat monitoring.
 */
@RestController
@RequestMapping("/api/v1/ping")
@Tag(name = "System Ping")
public class PingController {

    @GetMapping
    @Operation(summary = "Real-time latency heartbeat probe")
    public Map<String, Object> ping() {
        return Map.of(
                "status", "UP",
                "serverTime", Instant.now().toEpochMilli(),
                "region", "ap-south-india"
        );
    }
}

