package com.iitsm.infrastructure.realtime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.iitsm.application.dashboard.DashboardPublisher;
import com.iitsm.application.dashboard.DashboardViews.CountersMessage;
import com.iitsm.application.dashboard.DashboardViews.DashboardEvent;

/** Adapter: dashboard messages to the STOMP topic {@code /topic/dashboard} (API contract B.5). */
@Component
public class StompDashboardPublisher implements DashboardPublisher {

    public static final String TOPIC = "/topic/dashboard";

    private final SimpMessagingTemplate messaging;

    public StompDashboardPublisher(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @Override
    public void publish(DashboardEvent event) {
        messaging.convertAndSend(TOPIC, event);
    }

    @Override
    public void publish(CountersMessage counters) {
        messaging.convertAndSend(TOPIC, counters);
    }
}
