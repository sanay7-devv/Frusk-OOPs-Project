package com.iitsm.domain.priority;

/**
 * Everything a priority strategy may look at.
 *
 * @param criticality      business criticality of the affected service (1 to 5)
 * @param serviceName      for the explanation text, for example "Payment service is always P1"
 * @param alwaysP1Service  the service is flagged "always P1 on outage"
 * @param securityCategory the category is Security or one of its children
 */
public record PriorityInput(int impact, int urgency, int criticality, int affectedUsers, String serviceName,
                            boolean alwaysP1Service, boolean securityCategory) {
}
