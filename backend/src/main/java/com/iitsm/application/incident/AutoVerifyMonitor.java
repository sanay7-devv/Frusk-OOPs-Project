package com.iitsm.application.incident;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.iitsm.application.config.ConfigService;
import com.iitsm.domain.config.ConfigKey;
import com.iitsm.domain.incident.ClosureReason;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.incident.IncidentStatus;
import com.iitsm.domain.repository.IncidentRepository;

/**
 * The auto-verify job (G2, DEC-46, handbook 2.7): a RESOLVED incident the reporter never confirmed or reopened for
 * {@code verify.auto.hours} is moved to VERIFIED and closed with the reason AUTO_VERIFIED. Without it a resolved
 * incident would wait for a person forever. Same shape as the SLA monitor: one transaction per incident, a failure
 * is logged and retried next run, and a second run finds nothing left to do.
 */
@Service
public class AutoVerifyMonitor {

    private static final Logger log = LoggerFactory.getLogger(AutoVerifyMonitor.class);

    /** What one run did, for the log and for tests. */
    public record RunResult(int checked, int closed, int failed) {
    }

    private final IncidentRepository incidents;
    private final IncidentEventPublisher publisher;
    private final ConfigService config;
    private final TransactionTemplate transaction;
    private final Clock clock;

    public AutoVerifyMonitor(IncidentRepository incidents, IncidentEventPublisher publisher, ConfigService config,
                             PlatformTransactionManager transactions, Clock clock) {
        this.incidents = incidents;
        this.publisher = publisher;
        this.config = config;
        this.transaction = new TransactionTemplate(transactions);
        this.clock = clock;
    }

    public RunResult runOnce() {
        BigDecimal hours = config.current().decimalValue(ConfigKey.VERIFY_AUTO_HOURS);
        Instant cutoff = clock.instant().minus(Duration.ofMillis(hours.multiply(BigDecimal.valueOf(3_600_000)).longValue()));
        List<Long> candidates = incidents.findResolvedUpTo(cutoff);
        int closed = 0;
        int failed = 0;
        for (Long id : candidates) {
            try {
                if (Boolean.TRUE.equals(transaction.execute(status -> autoVerify(id, cutoff, hours)))) {
                    closed++;
                }
            } catch (RuntimeException ex) {
                failed++;
                log.warn("Auto-verify of incident {} failed, retrying next run: {}", id, ex.toString());
            }
        }
        return new RunResult(candidates.size(), closed, failed);
    }

    private boolean autoVerify(Long id, Instant cutoff, BigDecimal hours) {
        Incident incident = incidents.findById(id).orElse(null);
        // re-checked inside the transaction: the reporter may have verified or reopened it since the list was read
        if (incident == null || incident.getStatus() != IncidentStatus.RESOLVED
                || incident.getResolvedAt() == null || incident.getResolvedAt().isAfter(cutoff)) {
            return false;
        }
        Instant now = clock.instant();
        incident.verify(now);
        publisher.publishFact(incident, null, "Verified automatically: no reply from the reporter within "
                + hours.stripTrailingZeros().toPlainString() + " h of the resolution");
        incident.close(ClosureReason.AUTO_VERIFIED, now);
        publisher.publishFact(incident, null, "Closed automatically (AUTO_VERIFIED)");
        incidents.save(incident);
        log.info("Auto-verified and closed {}", incident.getCode());
        return true;
    }
}
