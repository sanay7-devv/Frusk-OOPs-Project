import type { IncidentSummary } from '../api/types';

export const COMPLETED = new Set(['RESOLVED', 'VERIFIED', 'CLOSED']);

/** Counts describe loaded records; they do not infer resolution times or SLA targets. */
export function summarizeIncidents(incidents: IncidentSummary[]) {
  const services = new Map<number, { id: number; name: string; total: number; open: number; critical: number; breached: number }>();
  const priority = { P1: 0, P2: 0, P3: 0, P4: 0, unclassified: 0 };
  let completed = 0, waiting = 0, working = 0, unassigned = 0;
  incidents.forEach(incident => {
    const active = !COMPLETED.has(incident.status);
    if (!active) completed++;
    else {
      if (incident.status === 'PENDING_USER_INFO') waiting++; else working++;
      if (!incident.assignee) unassigned++;
      if (incident.priority) priority[incident.priority]++; else priority.unclassified++;
    }
    const service = services.get(incident.service.id) || { id: incident.service.id, name: incident.service.name, total: 0, open: 0, critical: 0, breached: 0 };
    service.total++;
    if (active) service.open++;
    if (active && incident.priority === 'P1') service.critical++;
    if (incident.slaState === 'VIOLATED') service.breached++;
    services.set(service.id, service);
  });
  return { total: incidents.length, active: working + waiting, completed, waiting, working, unassigned, priority,
    services: [...services.values()].sort((a, b) => b.open - a.open || b.total - a.total || a.name.localeCompare(b.name)) };
}
