package com.iitsm.infrastructure.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.iitsm.domain.notification.PushDevice;
import com.iitsm.domain.notification.PushGateway;

/** Adapter: no push provider is connected, so the message goes to the log only (the device is named by its hint). */
@Component
public class SimulatedPushGateway implements PushGateway {

    private static final Logger log = LoggerFactory.getLogger(SimulatedPushGateway.class);

    @Override
    public void send(PushDevice device, String title, String body) {
        log.info("PUSH (simulated) to {} device {}: {}", device.getPlatform(), device.tokenHint(), title);
    }
}
