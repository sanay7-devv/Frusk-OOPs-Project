package com.iitsm.application.sla;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.iitsm.application.incident.IncidentViews.Ref;
import com.iitsm.domain.exception.InputValidationException;
import com.iitsm.domain.incident.SlaClockType;
import com.iitsm.domain.repository.PageSlice;
import com.iitsm.domain.repository.SlaViolationRepository;
import com.iitsm.domain.sla.SlaViolation;
import com.iitsm.domain.user.User;

/** GET /sla/violations for admins and team leads (API Data Dictionary C.4 SlaViolation). */
@Service
public class SlaViolationService {

    public record SlaViolationView(Long id, Long incidentId, String incidentCode, SlaClockType type,
                                   long overdueSeconds, Ref technician, Instant createdAt) {
    }

    /** Far enough in the future to mean "no upper bound" and still fit a TIMESTAMPTZ. */
    private static final Instant NO_END = Instant.parse("9999-01-01T00:00:00Z");

    private final SlaViolationRepository violations;

    public SlaViolationService(SlaViolationRepository violations) {
        this.violations = violations;
    }

    /** Violations recorded in [from, to), newest first; either bound may be null. */
    @Transactional(readOnly = true)
    public PageSlice<SlaViolationView> list(Instant from, Instant to, int page, int size) {
        Instant start = from == null ? Instant.EPOCH : from;
        Instant end = to == null ? NO_END : to;
        if (!start.isBefore(end)) {
            throw new InputValidationException("to", "must be after from");
        }
        return violations.findRecorded(start, end, page, size).map(SlaViolationService::view);
    }

    private static SlaViolationView view(SlaViolation v) {
        User technician = v.getTechnician();
        return new SlaViolationView(v.getId(), v.getIncident().getId(), v.getIncident().getCode(), v.getType(),
                v.getOverdueSeconds(), technician == null ? null : new Ref(technician.getId(), technician.getName()),
                v.getCreatedAt());
    }
}
