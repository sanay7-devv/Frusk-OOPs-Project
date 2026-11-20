package com.iitsm.infrastructure.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final StringToInstantConverter stringToInstantConverter;

    public WebConfig(StringToInstantConverter stringToInstantConverter) {
        this.stringToInstantConverter = stringToInstantConverter;
    }

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(stringToInstantConverter);
    }
}
