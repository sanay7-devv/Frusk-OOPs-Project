package com.iitsm.domain.priority;

import java.util.Optional;

/**
 * A business rule applied after the score (handbook 1.7 "override rules"). It can only raise the priority, and when
 * it applies, its explanation is recorded so users see why the band differs from the score.
 */
public interface PriorityOverrideRule {

    /** The minimum band this rule demands for the input, or empty if the rule does not apply. */
    Optional<Priority> minimumBand(PriorityInput input);

    /** The explanation shown to users, for example "Payment service is always P1". */
    String explanation(PriorityInput input);

    /** Rule 1: a Security incident on a service with criticality 4 or more is at least P2. */
    PriorityOverrideRule SECURITY_ON_CRITICAL_SERVICE = new PriorityOverrideRule() {
        @Override
        public Optional<Priority> minimumBand(PriorityInput input) {
            return input.securityCategory() && input.criticality() >= 4 ? Optional.of(Priority.P2) : Optional.empty();
        }

        @Override
        public String explanation(PriorityInput input) {
            return "Security incident on a critical service is at least P2";
        }
    };

    /** Rule 2: a service flagged "always P1 on outage" (Payment) is P1 when impact is 4 or more. */
    PriorityOverrideRule ALWAYS_P1_SERVICE_OUTAGE = new PriorityOverrideRule() {
        @Override
        public Optional<Priority> minimumBand(PriorityInput input) {
            return input.alwaysP1Service() && input.impact() >= 4 ? Optional.of(Priority.P1) : Optional.empty();
        }

        @Override
        public String explanation(PriorityInput input) {
            return input.serviceName() + " service is always P1";
        }
    };
}
