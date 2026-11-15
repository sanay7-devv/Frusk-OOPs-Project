// All incident API calls live here. Components never call axios directly.
import { api, tokenStore } from './client';
import type { IncidentDetail, IncidentSummary, Page, Priority, IncidentStatus, SlaState, AuditEntry, RecommendationView, SlaViolationView } from './types';
import { PREDEFINED_SERVICES, PREDEFINED_CATEGORIES } from './services';

export type IncidentFilters = Partial<{
  q: string;
  code: string;
  status: string[];
  priority: string[];
  escalationLevel?: number;
  categoryId: number;
  serviceId: number;
  assigneeId: number;
  slaState: string;
  createdFrom: string;
  createdTo: string;
  mine: boolean;
  assignedToMe: boolean;
  page: number;
  size: number;
  sort: string;
}>;

// Utility to create relative ISO dates
const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
const daysAgo = (d: number, hoursOffset: number = 2) => {
  const date = new Date(now.getTime() - d * 86400000);
  date.setHours(date.getHours() - hoursOffset);
  return date.toISOString();
};

// Initial realistic store of enterprise tickets (today's and previous days')
let SEED_INCIDENTS: IncidentDetail[] = [
  // --- TODAY'S TICKETS ---
  {
    id: 101,
    code: 'INC-2026-00101',
    title: 'Payment Gateway 504 Gateway Timeout Spikes',
    description: 'Ingress HTTP 504 spikes detected across India Central edge clusters (Mumbai / Hyderabad). High volume checkout failures in progress.',
    status: 'IN_PROGRESS',
    priority: 'P1',
    category: { id: 4, name: 'Performance & Latency Degradation' },
    service: { id: 5, name: 'Payment & Billing Engine' },
    reporter: { id: 4, name: 'John Employee' },
    assignee: { id: 2, name: 'Marcus Vance (Team Lead)' },
    createdAt: minsAgo(35),
    responseDue: minsAgo(20),
    resolutionDue: new Date(now.getTime() + 105 * 60000).toISOString(),
    slaState: 'OK',
    major: true,
    escalationLevel: 1, // Tier 2 / Team Lead Escalation
    impact: 5,
    urgency: 5,
    affectedUsers: 1420,
    priorityScore: 95,
    priorityBreakdown: { impact: 5, urgency: 5, criticality: 5, usersMultiplier: 1.5, baseScore: 75, score: 95, band: 'P1', overrideRule: 'Payment & Billing Engine is configured as Always P1' },
    acknowledgedAt: minsAgo(25),
    resolvedAt: null,
    closedAt: null,
    closureReason: null,
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: null,
    feedback: null,
    allowedActions: ['EDIT', 'COMMENT', 'REASSIGN', 'RESOLVE'],
    version: 1,
  },
  {
    id: 102,
    code: 'INC-2026-00102',
    title: 'Core Database Replica Lag Exceeding 120s Threshold',
    description: 'Aurora read-replica in ap-south-1b cluster falling behind master node during write burst. Read queries returning stale transaction state.',
    status: 'ASSIGNED',
    priority: 'P2',
    category: { id: 3, name: 'Data Integrity & Corruption' },
    service: { id: 4, name: 'Core Database Cluster (Postgres Aurora)' },
    reporter: { id: 7, name: 'Elena Rostova (DevOps SRE)' },
    assignee: { id: 3, name: 'Sarah Jenkins (Technician)' },
    createdAt: minsAgo(75),
    responseDue: minsAgo(45),
    resolutionDue: new Date(now.getTime() + 165 * 60000).toISOString(),
    slaState: 'OK',
    major: false,
    escalationLevel: 0, // Level 0 Frontline Tech
    impact: 4,
    urgency: 4,
    affectedUsers: 85,
    priorityScore: 78,
    priorityBreakdown: { impact: 4, urgency: 4, criticality: 5, usersMultiplier: 1.25, baseScore: 65, score: 78, band: 'P2', overrideRule: null },
    acknowledgedAt: minsAgo(60),
    resolvedAt: null,
    closedAt: null,
    closureReason: null,
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: null,
    feedback: null,
    allowedActions: ['EDIT', 'COMMENT', 'REASSIGN', 'START_WORK', 'RESOLVE'],
    version: 1,
  },
  {
    id: 103,
    code: 'INC-2026-00103',
    title: 'Okta SSO Handshake Timeout on Edge Auth Proxy',
    description: 'Enterprise SSO login loops occurring for engineering employees accessing staging clusters. SAML assertion validation intermittent.',
    status: 'ACKNOWLEDGED',
    priority: 'P1',
    category: { id: 2, name: 'Authentication & Access Controls' },
    service: { id: 1, name: 'Identity & SSO (Okta Gateway)' },
    reporter: { id: 4, name: 'John Employee' },
    assignee: { id: 1, name: 'System Administrator' },
    createdAt: minsAgo(160),
    responseDue: minsAgo(145),
    resolutionDue: new Date(now.getTime() + 80 * 60000).toISOString(),
    slaState: 'WARNING',
    major: true,
    escalationLevel: 2, // Level 2 SRE / Admin Escalation
    impact: 5,
    urgency: 4,
    affectedUsers: 340,
    priorityScore: 92,
    priorityBreakdown: { impact: 5, urgency: 4, criticality: 5, usersMultiplier: 1.5, baseScore: 70, score: 92, band: 'P1', overrideRule: 'Identity & SSO is configured as Always P1' },
    acknowledgedAt: minsAgo(150),
    resolvedAt: null,
    closedAt: null,
    closureReason: null,
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: null,
    feedback: null,
    allowedActions: ['EDIT', 'COMMENT', 'REASSIGN', 'START_WORK', 'RESOLVE'],
    version: 1,
  },
  {
    id: 104,
    code: 'INC-2026-00104',
    title: 'Corporate Wi-Fi AP Controller Packet Drop in Building C',
    description: 'Floor 3 access points dropping 15% packets after firmware update. Multiple employee workstations dropping connection.',
    status: 'NEW',
    priority: 'P3',
    category: { id: 1, name: 'Network & Connectivity' },
    service: { id: 2, name: 'Global VPN Gateway (AnyConnect Edge)' },
    reporter: { id: 4, name: 'John Employee' },
    assignee: null, // Unassigned - needs triage
    createdAt: minsAgo(210),
    responseDue: minsAgo(150),
    resolutionDue: new Date(now.getTime() + 320 * 60000).toISOString(),
    slaState: 'OK',
    major: false,
    escalationLevel: 0, // Level 0 Frontline Tech
    impact: 3,
    urgency: 3,
    affectedUsers: 28,
    priorityScore: 50,
    priorityBreakdown: { impact: 3, urgency: 3, criticality: 4, usersMultiplier: 1.25, baseScore: 45, score: 50, band: 'P3', overrideRule: null },
    acknowledgedAt: null,
    resolvedAt: null,
    closedAt: null,
    closureReason: null,
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: null,
    feedback: null,
    allowedActions: ['EDIT', 'COMMENT', 'ASSIGN'],
    version: 1,
  },
  {
    id: 105,
    code: 'INC-2026-00105',
    title: 'Outlook Mail Sync Delay on iOS Mobile Devices',
    description: 'Exchange ActiveSync delayed by 15-20 minutes for field staff mobile apps. Webmail and desktop clients working normally.',
    status: 'RESOLVED',
    priority: 'P4',
    category: { id: 4, name: 'Performance & Latency Degradation' },
    service: { id: 3, name: 'Email & Office 365 Cloud Suite' },
    reporter: { id: 4, name: 'John Employee' },
    assignee: { id: 3, name: 'Sarah Jenkins (Technician)' },
    createdAt: minsAgo(310),
    responseDue: minsAgo(190),
    resolutionDue: minsAgo(30),
    slaState: 'MET',
    major: false,
    escalationLevel: 0,
    impact: 2,
    urgency: 2,
    affectedUsers: 12,
    priorityScore: 35,
    priorityBreakdown: { impact: 2, urgency: 2, criticality: 3, usersMultiplier: 1.0, baseScore: 35, score: 35, band: 'P4', overrideRule: null },
    acknowledgedAt: minsAgo(280),
    resolvedAt: minsAgo(40),
    closedAt: null,
    closureReason: null,
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: {
      rootCause: 'Throttling policy limit hit on ActiveSync gateway pool',
      notes: 'Increased throttling threshold per device to 50 concurrent requests.',
      steps: 'Updated Microsoft 365 throttling policy in PowerShell command console.',
      timeSpentMinutes: 45,
      reusableSolution: true,
      resolvedBy: { id: 3, name: 'Sarah Jenkins (Technician)' }
    },
    feedback: null,
    allowedActions: ['COMMENT', 'CLOSE'],
    version: 2,
  },

  // --- PREVIOUS DAYS' TICKETS ---
  {
    id: 95,
    code: 'INC-2026-00095',
    title: 'Elasticsearch Hot-Tier Storage Node Out of Inodes',
    description: 'Node es-hot-03 reached 100% inode capacity due to runaway logging index. Cluster health yellow, query latency degraded.',
    status: 'RESOLVED',
    priority: 'P1',
    category: { id: 5, name: 'Hardware / Infrastructure Fault' },
    service: { id: 5, name: 'Payment & Billing Engine' },
    reporter: { id: 7, name: 'Elena Rostova (DevOps SRE)' },
    assignee: { id: 2, name: 'Marcus Vance (Team Lead)' },
    createdAt: daysAgo(1, 4),
    responseDue: daysAgo(1, 3.75),
    resolutionDue: daysAgo(1, 0),
    slaState: 'MET',
    major: true,
    escalationLevel: 2, // Level 2 SRE Escalation
    impact: 5,
    urgency: 5,
    affectedUsers: 1800,
    priorityScore: 98,
    priorityBreakdown: { impact: 5, urgency: 5, criticality: 5, usersMultiplier: 1.5, baseScore: 80, score: 98, band: 'P1', overrideRule: null },
    acknowledgedAt: daysAgo(1, 3.8),
    resolvedAt: daysAgo(1, 1),
    closedAt: null,
    closureReason: null,
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: {
      rootCause: 'ILM policy failed to rotate daily trace logs',
      notes: 'Force-merged indices and purged expired 14-day telemetry retention segments.',
      steps: 'Applied revised ILM policy and cleared ephemeral log files from /var/log.',
      timeSpentMinutes: 90,
      reusableSolution: true,
      resolvedBy: { id: 2, name: 'Marcus Vance (Team Lead)' }
    },
    feedback: null,
    allowedActions: ['COMMENT', 'CLOSE'],
    version: 3,
  },
  {
    id: 94,
    code: 'INC-2026-00094',
    title: 'Kubernetes Worker Node High Memory Eviction Fault',
    description: 'Node pool k8s-worker-ap-south-1a evicted 6 billing workers due to memory leak in payment callback consumer.',
    status: 'RESOLVED',
    priority: 'P2',
    category: { id: 5, name: 'Hardware / Infrastructure Fault' },
    service: { id: 5, name: 'Payment & Billing Engine' },
    reporter: { id: 7, name: 'Elena Rostova (DevOps SRE)' },
    assignee: { id: 1, name: 'System Administrator' },
    createdAt: daysAgo(1, 8),
    responseDue: daysAgo(1, 7.5),
    resolutionDue: daysAgo(1, 4),
    slaState: 'MET',
    major: false,
    escalationLevel: 1,
    impact: 4,
    urgency: 4,
    affectedUsers: 210,
    priorityScore: 76,
    priorityBreakdown: { impact: 4, urgency: 4, criticality: 5, usersMultiplier: 1.25, baseScore: 65, score: 76, band: 'P2', overrideRule: null },
    acknowledgedAt: daysAgo(1, 7.6),
    resolvedAt: daysAgo(1, 5),
    closedAt: null,
    closureReason: null,
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: {
      rootCause: 'Unbounded heap allocation in billing-worker-v2.14 stream parser',
      notes: 'Canary rollback to v2.13 executed successfully by ArgoCD automated sync.',
      steps: 'Rolled back container image deployment and restarted pod daemonset.',
      timeSpentMinutes: 45,
      reusableSolution: true,
      resolvedBy: { id: 1, name: 'System Administrator' }
    },
    feedback: null,
    allowedActions: ['COMMENT', 'CLOSE'],
    version: 2,
  },
  {
    id: 92,
    code: 'INC-2026-00092',
    title: 'Global VPN Gateway AnyConnect Edge Certificate Expiring',
    description: 'Wildcard SSL TLS certificate for anyconnect.corp.internal expires in 48 hours. Renewal CSR pending approval.',
    status: 'CLOSED',
    priority: 'P3',
    category: { id: 2, name: 'Authentication & Access Controls' },
    service: { id: 2, name: 'Global VPN Gateway (AnyConnect Edge)' },
    reporter: { id: 4, name: 'John Employee' },
    assignee: { id: 3, name: 'Sarah Jenkins (Technician)' },
    createdAt: daysAgo(2, 6),
    responseDue: daysAgo(2, 5),
    resolutionDue: daysAgo(2, 0),
    slaState: 'MET',
    major: false,
    escalationLevel: 0,
    impact: 3,
    urgency: 3,
    affectedUsers: 450,
    priorityScore: 55,
    priorityBreakdown: { impact: 3, urgency: 3, criticality: 4, usersMultiplier: 1.5, baseScore: 45, score: 55, band: 'P3', overrideRule: null },
    acknowledgedAt: daysAgo(2, 5.5),
    resolvedAt: daysAgo(2, 1),
    closedAt: daysAgo(1, 10),
    closureReason: 'SOLVED',
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: {
      rootCause: 'Automated ACME certbot renewal cron was paused during maintenance',
      notes: 'Manually issued DigiCert SSL wildcard certificate and bound to ASA firewall gateway.',
      steps: 'Imported PKCS12 bundle into Cisco Adaptive Security Appliance.',
      timeSpentMinutes: 60,
      reusableSolution: false,
      resolvedBy: { id: 3, name: 'Sarah Jenkins (Technician)' }
    },
    feedback: { rating: 5, comment: 'Quick turnaround before certificate expiration.' },
    allowedActions: ['COMMENT'],
    version: 3,
  },
  {
    id: 89,
    code: 'INC-2026-00089',
    title: 'Finance Billing Batch Job Stalled at Transaction Reconciliation',
    description: 'End-of-day settlement batch process timed out at ledger reconciliation step. 1,450 merchant settlement payouts queued.',
    status: 'CLOSED',
    priority: 'P2',
    category: { id: 4, name: 'Performance & Latency Degradation' },
    service: { id: 5, name: 'Payment & Billing Engine' },
    reporter: { id: 4, name: 'John Employee' },
    assignee: { id: 2, name: 'Marcus Vance (Team Lead)' },
    createdAt: daysAgo(3, 2),
    responseDue: daysAgo(3, 1.5),
    resolutionDue: daysAgo(2, 18),
    slaState: 'MET',
    major: false,
    escalationLevel: 1,
    impact: 4,
    urgency: 4,
    affectedUsers: 1450,
    priorityScore: 80,
    priorityBreakdown: { impact: 4, urgency: 4, criticality: 5, usersMultiplier: 1.5, baseScore: 65, score: 80, band: 'P2', overrideRule: null },
    acknowledgedAt: daysAgo(3, 1.6),
    resolvedAt: daysAgo(3, 0),
    closedAt: daysAgo(2, 5),
    closureReason: 'SOLVED',
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: {
      rootCause: 'Deadlock on transaction ledger index during simultaneous batch export',
      notes: 'Killed blocking session pid 8492 and rerun settlement batch with partitioned locks.',
      steps: 'Optimized index locking query with pg_cancel_backend and reindexed table.',
      timeSpentMinutes: 120,
      reusableSolution: true,
      resolvedBy: { id: 2, name: 'Marcus Vance (Team Lead)' }
    },
    feedback: { rating: 5, comment: 'Merchant settlements completed successfully.' },
    allowedActions: ['COMMENT'],
    version: 3,
  },
  {
    id: 85,
    code: 'INC-2026-00085',
    title: 'Jenkins CI/CD Build Runner Temporary Disk Full',
    description: 'Docker image cache filled up root volume /var/lib/docker on CI agent ci-runner-04. Pipeline builds queued.',
    status: 'CLOSED',
    priority: 'P4',
    category: { id: 5, name: 'Hardware / Infrastructure Fault' },
    service: { id: 1, name: 'Identity & SSO (Okta Gateway)' },
    reporter: { id: 7, name: 'Elena Rostova (DevOps SRE)' },
    assignee: { id: 3, name: 'Sarah Jenkins (Technician)' },
    createdAt: daysAgo(5, 5),
    responseDue: daysAgo(5, 3),
    resolutionDue: daysAgo(4, 12),
    slaState: 'MET',
    major: false,
    escalationLevel: 0,
    impact: 2,
    urgency: 2,
    affectedUsers: 18,
    priorityScore: 32,
    priorityBreakdown: { impact: 2, urgency: 2, criticality: 3, usersMultiplier: 1.0, baseScore: 32, score: 32, band: 'P4', overrideRule: null },
    acknowledgedAt: daysAgo(5, 4),
    resolvedAt: daysAgo(5, 2),
    closedAt: daysAgo(4, 8),
    closureReason: 'SOLVED',
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: {
      rootCause: 'Dangling container layers from aborted build tests',
      notes: 'Executed docker system prune -af and scheduled weekly cron cleanup.',
      steps: 'Cleared 48GB of unused images and restarted Jenkins agent service.',
      timeSpentMinutes: 30,
      reusableSolution: true,
      resolvedBy: { id: 3, name: 'Sarah Jenkins (Technician)' }
    },
    feedback: null,
    allowedActions: ['COMMENT'],
    version: 2,
  },
  {
    id: 80,
    code: 'INC-2026-00080',
    title: 'Legacy RADIUS Auth Edge Server Intermittent Timeout',
    description: 'Legacy VPN dial-in gateway intermittent failure for branch office dialers.',
    status: 'CLOSED',
    priority: 'P3',
    category: { id: 1, name: 'Network & Connectivity' },
    service: { id: 2, name: 'Global VPN Gateway (AnyConnect Edge)' },
    reporter: { id: 4, name: 'John Employee' },
    assignee: null, // Unassigned
    createdAt: daysAgo(7, 3),
    responseDue: daysAgo(7, 1),
    resolutionDue: daysAgo(6, 10),
    slaState: 'MET',
    major: false,
    escalationLevel: 0,
    impact: 3,
    urgency: 2,
    affectedUsers: 15,
    priorityScore: 42,
    priorityBreakdown: { impact: 3, urgency: 2, criticality: 4, usersMultiplier: 1.0, baseScore: 42, score: 42, band: 'P3', overrideRule: null },
    acknowledgedAt: daysAgo(7, 2),
    resolvedAt: daysAgo(7, 0),
    closedAt: daysAgo(6, 5),
    closureReason: 'SOLVED',
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: {
      rootCause: 'UDP socket exhaustion on legacy FreeRADIUS service daemon',
      notes: 'Replaced daemon with modern RADIUS relay server.',
      steps: 'Migrated RADIUS authentications to Active Directory LDAP bridge.',
      timeSpentMinutes: 90,
      reusableSolution: false,
      resolvedBy: { id: 1, name: 'System Administrator' }
    },
    feedback: null,
    allowedActions: ['COMMENT'],
    version: 2,
  },
];

// Helper to filter mock incidents
function filterMockIncidents(f: IncidentFilters): Page<IncidentSummary> {
  let list = [...SEED_INCIDENTS];

  if (f.q) {
    const q = f.q.toLowerCase().trim();
    list = list.filter(
      (i) =>
        i.code.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.service.name.toLowerCase().includes(q) ||
        (i.assignee && i.assignee.name.toLowerCase().includes(q)) ||
        i.reporter.name.toLowerCase().includes(q)
    );
  }

  if (f.code) {
    list = list.filter((i) => i.code.toLowerCase() === f.code!.toLowerCase());
  }

  if (f.status && f.status.length > 0 && !f.status.includes('ALL')) {
    list = list.filter((i) => f.status!.includes(i.status));
  }

  if (f.priority && f.priority.length > 0 && !f.priority.includes('ALL')) {
    list = list.filter((i) => i.priority && f.priority!.includes(i.priority));
  }

  if (f.escalationLevel !== undefined && f.escalationLevel !== null) {
    list = list.filter((i) => i.escalationLevel === Number(f.escalationLevel));
  }

  if (f.serviceId) {
    list = list.filter((i) => i.service.id === Number(f.serviceId));
  }

  if (f.assigneeId) {
    list = list.filter((i) => i.assignee && i.assignee.id === Number(f.assigneeId));
  }

  if (f.createdFrom) {
    const fromTime = new Date(f.createdFrom).getTime();
    list = list.filter((i) => new Date(i.createdAt).getTime() >= fromTime);
  }

  if (f.createdTo) {
    const toTime = new Date(f.createdTo).getTime();
    list = list.filter((i) => new Date(i.createdAt).getTime() < toTime);
  }

  const summaries: IncidentSummary[] = list.map((i) => ({
    id: i.id,
    code: i.code,
    title: i.title,
    status: i.status,
    priority: i.priority,
    category: i.category,
    service: i.service,
    reporter: i.reporter,
    assignee: i.assignee,
    createdAt: i.createdAt,
    responseDue: i.responseDue,
    resolutionDue: i.resolutionDue,
    slaState: i.slaState,
    major: i.major,
    escalationLevel: i.escalationLevel,
  }));

  const page = f.page ?? 0;
  const size = f.size ?? 50;
  const totalItems = summaries.length;
  const totalPages = Math.ceil(totalItems / size) || 1;
  const items = summaries.slice(page * size, (page + 1) * size);

  return { items, page, size, totalItems, totalPages };
}

export const listIncidents = async (f: IncidentFilters = {}): Promise<Page<IncidentSummary>> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return filterMockIncidents(f);
  }
  const res = await api.get<Page<IncidentSummary>>('/incidents', {
    params: f,
    paramsSerializer: { indexes: null },
  });
  return res.data;
};

export const getIncident = async (id: number): Promise<IncidentDetail> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    const found = SEED_INCIDENTS.find((i) => i.id === id);
    if (found) return found;
  }
  const res = await api.get<IncidentDetail>(`/incidents/${id}`);
  return res.data;
};

export interface CreateIncidentPayload {
  title: string;
  description: string;
  serviceId: number;
  categoryId?: number | null;
  impact: number;
  urgency: number;
  affectedUsers: number;
  confirmNotDuplicate?: boolean;
}

export const createIncident = async (body: CreateIncidentPayload): Promise<IncidentDetail> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return mockCreateIncident(body);
  }
  const res = await api.post<IncidentDetail>('/incidents', body);
  return res.data;
};

function calculateMockPriority(impact: number, urgency: number, criticality: number): Priority {
  const score = impact * 2 + urgency * 2 + criticality;
  if (score >= 20) return 'P1';
  if (score >= 14) return 'P2';
  if (score >= 9) return 'P3';
  return 'P4';
}

function mockCreateIncident(body: CreateIncidentPayload): Promise<IncidentDetail> {
  const service = PREDEFINED_SERVICES.find((s) => s.id === body.serviceId) || PREDEFINED_SERVICES[0];
  const category = PREDEFINED_CATEGORIES.find((c) => c.id === body.categoryId) || null;
  const priority = service.alwaysP1 ? 'P1' : calculateMockPriority(body.impact, body.urgency, service.criticality);
  const codeNumber = Math.floor(10000 + Math.random() * 90000);
  const code = `INC-2026-${codeNumber}`;
  const currentTime = new Date();
  const responseDue = new Date(
    currentTime.getTime() + (priority === 'P1' ? 15 : priority === 'P2' ? 30 : 60) * 60000
  ).toISOString();
  const resolutionDue = new Date(
    currentTime.getTime() + (priority === 'P1' ? 120 : priority === 'P2' ? 240 : 480) * 60000
  ).toISOString();

  const mockDetail: IncidentDetail = {
    id: codeNumber,
    code,
    title: body.title,
    description: body.description,
    status: 'ASSIGNED',
    priority,
    category: category ? { id: category.id, name: category.name } : null,
    service: { id: service.id, name: service.name },
    reporter: { id: 4, name: 'John Employee' },
    assignee: { id: 3, name: 'Sarah Jenkins (Technician)' },
    createdAt: currentTime.toISOString(),
    responseDue,
    resolutionDue,
    slaState: 'OK',
    major: priority === 'P1',
    escalationLevel: priority === 'P1' ? 1 : 0,
    impact: body.impact,
    urgency: body.urgency,
    affectedUsers: body.affectedUsers,
    priorityScore: body.impact * 20 + body.urgency * 15 + service.criticality * 10,
    priorityBreakdown: {
      impact: body.impact,
      urgency: body.urgency,
      criticality: service.criticality,
      usersMultiplier: body.affectedUsers > 100 ? 1.5 : body.affectedUsers > 10 ? 1.25 : 1.0,
      baseScore: 120,
      score: 160,
      band: priority,
      overrideRule: service.alwaysP1 ? `${service.name} is configured as Always P1` : null,
    },
    acknowledgedAt: null,
    resolvedAt: null,
    closedAt: null,
    closureReason: null,
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: null,
    feedback: null,
    allowedActions: ['EDIT', 'COMMENT', 'REASSIGN', 'START_WORK', 'RESOLVE'],
    version: 1,
  };

  SEED_INCIDENTS.unshift(mockDetail);
  return Promise.resolve(mockDetail);
}

// Quick helper to reassign an incident in memory when offline
export const reassignMockIncident = (id: number, technicianId: number, technicianName: string) => {
  const inc = SEED_INCIDENTS.find((i) => i.id === id);
  if (inc) {
    inc.assignee = { id: technicianId, name: technicianName };
    if (inc.status === 'NEW') inc.status = 'ASSIGNED';
  }
};

// Generic action endpoint: acknowledge, start, request-info, provide-info, resolve, verify, close, reopen, reassign, escalate...
export const incidentAction = async (id: number, action: string, body?: unknown) => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/${action}`, body);
  return res.data;
};

export const provideInfo = async (id: number, message: string): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/provide-info`, { message });
  return res.data;
};

export const verifyIncident = async (id: number): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/verify`);
  return res.data;
};

export const reopenIncident = async (id: number, reason: string): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/reopen`, { reason });
  return res.data;
};

export const withdrawIncident = async (id: number, reason: string): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/withdraw`, { reason });
  return res.data;
};

export const submitFeedback = async (id: number, rating: number, comment?: string): Promise<unknown> => {
  const res = await api.post(`/incidents/${id}/feedback`, { rating, comment });
  return res.data;
};

export const getRecommendations = async (id: number): Promise<RecommendationView> => {
  const res = await api.get<RecommendationView>(`/incidents/${id}/recommendations`);
  return res.data;
};

export const assignIncident = async (id: number, technicianId?: number | null): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/assign`, {
    technicianId: technicianId ?? null,
  });
  return res.data;
};

export const getSlaViolations = async (params?: { from?: string; to?: string; page?: number; size?: number }): Promise<Page<SlaViolationView>> => {
  const res = await api.get<Page<SlaViolationView>>('/sla/violations', { params });
  return res.data;
};

export const getHistory = async (id: number): Promise<AuditEntry[]> => {
  const res = await api.get<AuditEntry[]>(`/incidents/${id}/history`);
  return res.data;
};

export const getComments = async (id: number) => {
  const res = await api.get(`/incidents/${id}/comments`);
  return res.data;
};

export const addComment = async (id: number, body: string, visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC') => {
  const res = await api.post(`/incidents/${id}/comments`, { body, visibility });
  return res.data;
};
