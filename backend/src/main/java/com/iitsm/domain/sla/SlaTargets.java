package com.iitsm.domain.sla;

import java.time.Duration;

/** What an incident's SLA clocks need from its policy: both targets and the calendar they are counted in. */
public record SlaTargets(Duration response, Duration resolution, WorkCalendar calendar) {
}
