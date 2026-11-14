package com.iitsm.infrastructure.realtime;

import java.util.Map;
import java.util.Optional;

import com.iitsm.domain.user.PermissionKey;

/**
 * Who may subscribe to which STOMP destination (decision DEC-42: the same permission rules as REST, by
 * {@link PermissionKey}, never by role name). A destination not listed here is refused.
 * <ul>
 *   <li>{@code /user/queue/notifications}: any logged-in user; the broker only delivers their own messages there.</li>
 *   <li>{@code /topic/dashboard}: {@code REPORT_VIEW}, held by administrators only, the same permission as
 *       {@code GET /dashboard/live} (DEC-80).</li>
 * </ul>
 */
public final class StompDestinationPolicy {

    public static final String NOTIFICATIONS = "/user/queue/notifications";
    public static final String DASHBOARD = StompDashboardPublisher.TOPIC;

    /** Destination to required permission; an empty Optional means "any logged-in user". */
    private static final Map<String, Optional<PermissionKey>> RULES = Map.of(
            NOTIFICATIONS, Optional.empty(),
            DASHBOARD, Optional.of(PermissionKey.REPORT_VIEW));

    private StompDestinationPolicy() {
    }

    /** Why the subscription is refused, or empty when it is allowed. */
    public static Optional<String> refusal(StompPrincipal principal, String destination) {
        Optional<PermissionKey> rule = destination == null ? null : RULES.get(destination);
        if (rule == null) {
            return Optional.of("Unknown destination " + destination + "; allowed: " + RULES.keySet());
        }
        if (rule.isPresent() && !principal.user().can(rule.get())) {
            return Optional.of("Subscribing to " + destination + " needs " + rule.get());
        }
        return Optional.empty();
    }
}
