import type { IncidentFilters } from '../../../api/incidents';

/** Statuses that count as "active" (not yet resolved or closed). The API has no such filter, so it is a list. */
export const ACTIVE_STATUSES = ['NEW', 'CLASSIFIED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_USER_INFO', 'REOPENED'];
export const ALL_STATUSES = [...ACTIVE_STATUSES, 'RESOLVED', 'VERIFIED', 'CLOSED'];
export const SLA_STATES = ['OK', 'WARNING', 'AT_RISK', 'VIOLATED', 'PAUSED', 'MET'];
export const TABS = ['today', 'previous', 'all'] as const;
export type TabKey = (typeof TABS)[number];

/** URL keys that make up a saved view (the page and the open drawer are not part of it). */
export const FILTER_KEYS = [
  'q', 'code', 'status', 'priority', 'level', 'serviceId', 'categoryId', 'slaState', 'assigneeId', 'reporterId', 'from', 'to', 'tab',
] as const;

export function tabOf(params: URLSearchParams): TabKey {
  const t = params.get('tab');
  return (TABS as readonly string[]).includes(t ?? '') ? (t as TabKey) : 'all';
}

const num = (v: string | null) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Date range for the API. Today and Previous tabs override the manual dates. */
export function dateRange(params: URLSearchParams, now = new Date()): { createdFrom?: string; createdTo?: string } {
  const tab = tabOf(params);
  const today = startOfDay(now);
  if (tab === 'today') return { createdFrom: today.toISOString() };
  if (tab === 'previous') return { createdTo: today.toISOString() };
  const from = params.get('from');
  const to = params.get('to');
  const out: { createdFrom?: string; createdTo?: string } = {};
  if (from) out.createdFrom = new Date(`${from}T00:00:00`).toISOString();
  if (to) {
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    out.createdTo = end.toISOString();
  }
  return out;
}

/** Turns the URL query into the API filter. */
export function toApiFilters(params: URLSearchParams, now = new Date()): IncidentFilters {
  const status = params.get('status');
  const priority = params.get('priority');
  const q = params.get('q')?.trim();
  const code = params.get('code')?.trim();
  return {
    q: q || undefined,
    code: code || undefined,
    status: status === 'ACTIVE' ? ACTIVE_STATUSES : status ? [status] : undefined,
    priority: priority ? [priority] : undefined,
    minEscalationLevel: num(params.get('level')),
    serviceId: num(params.get('serviceId')),
    categoryId: num(params.get('categoryId')),
    assigneeId: num(params.get('assigneeId')),
    reporterId: num(params.get('reporterId')),
    slaState: params.get('slaState') || undefined,
    ...dateRange(params, now),
    page: num(params.get('page')) ?? 0,
    sort: 'createdAt,desc',
  };
}

export function snapshot(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  FILTER_KEYS.forEach((k) => {
    const v = params.get(k);
    if (v) out[k] = v;
  });
  return out;
}

export function fromSnapshot(filter: Record<string, unknown>): URLSearchParams {
  const p = new URLSearchParams();
  FILTER_KEYS.forEach((k) => {
    const v = filter[k];
    if (typeof v === 'string' && v) p.set(k, v);
  });
  return p;
}
