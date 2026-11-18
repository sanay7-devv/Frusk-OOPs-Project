import { api } from './client';
import type { IncidentSummary, Priority, IncidentStatus } from './types';
import type { LabelCount, ReportOverview } from './reports';

export type DashboardEventType =
  | 'INCIDENT_CREATED' | 'INCIDENT_ASSIGNED' | 'INCIDENT_ACKNOWLEDGED' | 'PRIORITY_CHANGED' | 'INFO_REQUESTED'
  | 'INFO_PROVIDED' | 'SLA_WARNING' | 'SLA_VIOLATED' | 'INCIDENT_ESCALATED' | 'INCIDENT_RESOLVED'
  | 'INCIDENT_VERIFIED' | 'INCIDENT_CLOSED' | 'INCIDENT_REOPENED' | 'DUPLICATE_SUSPECTED' | 'TRIAGE_NEEDED';

export interface DashboardEvent {
  type: DashboardEventType;
  incidentId: number | null;
  code: string | null;
  priority: Priority | null;
  status: IncidentStatus | null;
  at: string;
}

/** Same definitions as /reports/overview, over every incident. */
export type DashboardCounters = Pick<ReportOverview, 'total' | 'open' | 'critical' | 'resolved' | 'slaViolations'>;

export interface LiveDashboard {
  counters: DashboardCounters;
  /** Open incidents per priority. */
  byPriority: LabelCount[];
  atRisk: IncidentSummary[];
  recentEvents: DashboardEvent[];
}

export const getLiveDashboard = async () => (await api.get<LiveDashboard>('/dashboard/live')).data;
