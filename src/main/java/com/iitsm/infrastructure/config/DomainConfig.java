package com.iitsm.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.iitsm.domain.repository.SlaPolicyRepository;
import com.iitsm.domain.sla.SlaPolicyResolver;

/** Registers plain-Java domain services as beans, so the domain classes themselves stay free of Spring. */
@Configuration
public class DomainConfig {

    @Bean
    SlaPolicyResolver slaPolicyResolver(SlaPolicyRepository slaPolicies) {
        return new SlaPolicyResolver(slaPolicies);
    }
}
