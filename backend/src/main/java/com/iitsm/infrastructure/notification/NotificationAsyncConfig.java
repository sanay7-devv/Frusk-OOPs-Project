package com.iitsm.infrastructure.notification;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import com.iitsm.domain.notification.NotificationFactory;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import org.springframework.core.io.ClassPathResource;

/**
 * Threads and wording of the notification module (decision DEC-54):
 * <ul>
 *   <li>{@code notificationExecutor}: ONE worker thread. Events are handled after commit, off the request thread,
 *       and in the order they happened, which the digest of an SLA monitor run relies on.</li>
 *   <li>{@code notificationRetryScheduler}: where email attempts and their delayed retries run, so a slow or dead
 *       mail server never holds up the worker.</li>
 *   <li>the {@link NotificationFactory}, loaded from {@code notification-templates.properties}.</li>
 * </ul>
 */
@Configuration
@EnableAsync
public class NotificationAsyncConfig {

    @Bean("notificationExecutor")
    Executor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(10_000);
        executor.setThreadNamePrefix("notify-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);
        return executor;
    }

    @Bean(name = "notificationRetryScheduler", destroyMethod = "shutdownNow")
    ScheduledExecutorService notificationRetryScheduler() {
        return Executors.newScheduledThreadPool(2, runnable -> {
            Thread thread = new Thread(runnable, "notify-mail");
            thread.setDaemon(true);
            return thread;
        });
    }

    @Bean
    NotificationFactory notificationFactory() throws IOException {
        Properties properties = new Properties();
        try (Reader reader = new InputStreamReader(
                new ClassPathResource("notification-templates.properties").getInputStream(), StandardCharsets.UTF_8)) {
            properties.load(reader);
        }
        Map<String, String> templates = new HashMap<>();
        properties.forEach((key, value) -> templates.put(key.toString(), value.toString()));
        return new NotificationFactory(templates);
    }
}
