package com.iitsm.infrastructure.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.iitsm.domain.incident.IncidentCodeGenerator;
import com.iitsm.domain.incident.IncidentFactory;
import com.iitsm.domain.priority.PriorityEngine;
import com.iitsm.domain.repository.SlaPolicyRepository;
import com.iitsm.domain.sla.SlaPolicyResolver;

/** Registers plain-Java domain services as beans, so the domain classes themselves stay free of Spring. */
@Configuration
public class DomainConfig {

    @Bean
    SlaPolicyResolver slaPolicyResolver(SlaPolicyRepository slaPolicies) {
        return new SlaPolicyResolver(slaPolicies);
    }

    @Bean
    IncidentFactory incidentFactory(IncidentCodeGenerator codes, Clock clock) {
        return new IncidentFactory(codes, clock);
    }

    /** Weighted strategy plus the two override rules from handbook 1.7. */
    @Bean
    PriorityEngine priorityEngine() {
        return PriorityEngine.standard();
    }
}
