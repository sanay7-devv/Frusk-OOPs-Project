package com.iitsm.application.incident.command;

import java.time.Instant;

import com.iitsm.domain.config.AppSettings;
import com.iitsm.domain.incident.Incident;
import com.iitsm.domain.sla.SlaPolicy;
import com.iitsm.domain.sla.SlaPolicyResolver;

/** What a command may need besides the incident: the time of the call, the live settings and the SLA policy. */
public record CommandContext(Instant now, AppSettings settings, SlaPolicyResolver slaPolicies) {

    /** The SLA policy that applies to the incident's service and current priority. */
    public SlaPolicy slaPolicyOf(Incident incident) {
        return slaPolicies.resolve(incident.getService(), incident.getPriority());
    }
}
