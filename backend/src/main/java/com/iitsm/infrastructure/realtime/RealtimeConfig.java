package com.iitsm.infrastructure.realtime;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Threads of the real-time layer (module M13):
 * <ul>
 *   <li>{@code dashboardExecutor}: ONE worker thread for {@code DashboardListener}, so dashboard events are pushed in
 *       the order they happened and never on the request thread. Separate from the notification worker, so a slow
 *       mail server cannot delay the dashboard.</li>
 *   <li>{@code socketExpiryScheduler}: closes each WebSocket session when its access token expires (DEC-82). A plain
 *       scheduled executor, not a Spring TaskScheduler bean, so it never competes with the scheduler of the jobs.</li>
 * </ul>
 */
@Configuration
public class RealtimeConfig {

    @Bean("dashboardExecutor")
    Executor dashboardExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(10_000);
        executor.setThreadNamePrefix("dashboard-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(5);
        return executor;
    }

    @Bean(name = "socketExpiryScheduler", destroyMethod = "shutdownNow")
    ScheduledExecutorService socketExpiryScheduler() {
        return Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "ws-expiry");
            thread.setDaemon(true);
            return thread;
        });
    }
}
