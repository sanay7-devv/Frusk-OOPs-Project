package com.iitsm.application.problem;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.iitsm.application.notification.NotificationDispatcher;
import com.iitsm.application.notification.NotificationRequest;

/**
 * Sends the one "your outage is resolved" notice to everyone who joined a known outage (decision DEC-73). The
 * joiners' own incidents are already closed as duplicates, so the normal incident events never reach them; this goes
 * straight through the notification dispatcher, after the resolving transaction committed, on the notification
 * executor so the technician's request does not wait for e-mail.
 */
@Component
public class JoinerNotifier {

    private static final Logger log = LoggerFactory.getLogger(JoinerNotifier.class);

    private final NotificationDispatcher dispatcher;

    public JoinerNotifier(NotificationDispatcher dispatcher) {
        this.dispatcher = dispatcher;
    }

    @Async("notificationExecutor")
    public void notifyResolved(List<NotificationRequest> requests) {
        for (NotificationRequest request : requests) {
            try {
                dispatcher.dispatch(request);
            } catch (RuntimeException ex) {
                log.warn("Could not notify {} about {}: {}", request.recipient().id(), request.incidentCode(),
                        ex.toString());
            }
        }
    }
}
