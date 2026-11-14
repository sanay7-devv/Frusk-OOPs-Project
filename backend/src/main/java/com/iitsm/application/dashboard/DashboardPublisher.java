package com.iitsm.application.dashboard;

import com.iitsm.application.dashboard.DashboardViews.CountersMessage;
import com.iitsm.application.dashboard.DashboardViews.DashboardEvent;

/**
 * Port: where dashboard messages go. The STOMP adapter in {@code infrastructure/realtime} sends them to
 * {@code /topic/dashboard}; the application layer never sees the broker.
 */
public interface DashboardPublisher {

    void publish(DashboardEvent event);

    void publish(CountersMessage counters);
}
