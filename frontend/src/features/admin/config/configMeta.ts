import { humanizeEnum } from '../../../utils/format';
// How each runtime setting is edited. The API (`ConfigItemView`) carries only key, value, default and description,
// so the kind and range of every key are copied from the backend's `ConfigKey` enum (the same ranges the server
// enforces). A key missing here (a newer backend) still renders as a plain text field and the server validates it.

export type KeyMeta =
  | { kind: 'integer' | 'decimal'; min: number; max: number }
  | { kind: 'choice'; choices: string[] }
  | { kind: 'text'; maxLength: number }
  | { kind: 'time' | 'zone' | 'days' | 'dates' | 'email' | 'url' | 'optional_url' };

export const KEY_META: Record<string, KeyMeta> = {
  'priority.strategy': { kind: 'choice', choices: ['WEIGHTED'] },
  'priority.band.p1': { kind: 'integer', min: 1, max: 100000 },
  'priority.band.p2': { kind: 'integer', min: 1, max: 100000 },
  'priority.band.p3': { kind: 'integer', min: 1, max: 100000 },
  'priority.users.mid.threshold': { kind: 'integer', min: 2, max: 1000000 },
  'priority.users.high.threshold': { kind: 'integer', min: 3, max: 1000000 },
  'priority.users.mid.multiplier': { kind: 'decimal', min: 1, max: 10 },
  'priority.users.high.multiplier': { kind: 'decimal', min: 1, max: 10 },
  'assignment.strategy': { kind: 'choice', choices: ['COMPOSITE', 'SKILL', 'LOAD', 'ROUND_ROBIN', 'EXPERIENCE_PRIORITY'] },
  'assignment.weight.skill': { kind: 'decimal', min: 0, max: 1 },
  'assignment.weight.load': { kind: 'decimal', min: 0, max: 1 },
  'assignment.weight.experience': { kind: 'decimal', min: 0, max: 1 },
  'assignment.weight.priority': { kind: 'decimal', min: 0, max: 1 },
  'assignment.weight.familiarity': { kind: 'decimal', min: 0, max: 1 },
  'assignment.familiarity.window.days': { kind: 'integer', min: 1, max: 365 },
  'assignment.familiarity.target': { kind: 'integer', min: 1, max: 100 },
  'sla.warn.first.percent': { kind: 'integer', min: 1, max: 99 },
  'sla.warn.second.percent': { kind: 'integer', min: 1, max: 99 },
  'sla.monitor.interval.seconds': { kind: 'integer', min: 5, max: 3600 },
  'sla.business.zone': { kind: 'zone' },
  'sla.business.open': { kind: 'time' },
  'sla.business.close': { kind: 'time' },
  'sla.business.days': { kind: 'days' },
  'sla.business.holidays': { kind: 'dates' },
  'escalation.monitor.interval.seconds': { kind: 'integer', min: 5, max: 3600 },
  'escalation.exhausted.minutes': { kind: 'integer', min: 1, max: 1440 },
  'dup.threshold.duplicate': { kind: 'decimal', min: 0, max: 1 },
  'dup.threshold.related': { kind: 'decimal', min: 0, max: 1 },
  'dup.window.hours': { kind: 'integer', min: 1, max: 720 },
  'autocat.min.confidence': { kind: 'decimal', min: 0, max: 1 },
  'sla.risk.threshold': { kind: 'decimal', min: 0, max: 1 },
  'verify.auto.hours': { kind: 'decimal', min: 0.01, max: 720 },
  'verify.monitor.interval.seconds': { kind: 'integer', min: 5, max: 3600 },
  'reopen.window.days': { kind: 'integer', min: 1, max: 90 },
  'ai.primary': { kind: 'choice', choices: ['LLM', 'KEYWORD'] },
  'notification.digest.threshold': { kind: 'integer', min: 1, max: 1000 },
  'notification.email.retries': { kind: 'integer', min: 0, max: 10 },
  'notification.email.backoff.seconds': { kind: 'integer', min: 1, max: 300 },
  'notification.email.from': { kind: 'email' },
  'notification.link.base.url': { kind: 'url' },
  'notification.chat.webhook.url': { kind: 'optional_url' },
  'dup.tfidf.threshold.duplicate': { kind: 'decimal', min: 0, max: 1 },
  'dup.tfidf.threshold.related': { kind: 'decimal', min: 0, max: 1 },
  'dup.embedding.threshold.duplicate': { kind: 'decimal', min: 0, max: 1 },
  'dup.embedding.threshold.related': { kind: 'decimal', min: 0, max: 1 },
  'embedding.rate.per.minute': { kind: 'integer', min: 1, max: 1000 },
  'embedding.backfill.batch': { kind: 'integer', min: 1, max: 100 },
  'embedding.backfill.interval.seconds': { kind: 'integer', min: 5, max: 3600 },
  'resolution.min.similarity': { kind: 'decimal', min: 0, max: 1 },
  'ai.idf.window.days': { kind: 'integer', min: 1, max: 365 },
  'ai.timeout.seconds': { kind: 'integer', min: 1, max: 60 },
  'ai.breaker.failures': { kind: 'integer', min: 1, max: 100 },
  'ai.breaker.cooloff.seconds': { kind: 'integer', min: 1, max: 86400 },
  'ai.cache.ttl.seconds': { kind: 'integer', min: 0, max: 3600 },
  'ai.ratelimit.per.minute': { kind: 'integer', min: 1, max: 10000 },
  'sla.risk.weight.elapsed': { kind: 'decimal', min: 0, max: 1 },
  'sla.risk.weight.load': { kind: 'decimal', min: 0, max: 1 },
  'sla.risk.weight.priority': { kind: 'decimal', min: 0, max: 1 },
  'sla.risk.weight.history': { kind: 'decimal', min: 0, max: 1 },
  'sla.risk.scan.interval.seconds': { kind: 'integer', min: 5, max: 86400 },
  'report.export.max.rows': { kind: 'integer', min: 1, max: 100000 },
  'report.trend.max.buckets': { kind: 'integer', min: 1, max: 5000 },
  'coverage.window.days': { kind: 'integer', min: 1, max: 365 },
  'coverage.min.criticality': { kind: 'integer', min: 1, max: 5 },
  'coverage.min.holders': { kind: 'integer', min: 1, max: 50 },
  'saved.filters.max': { kind: 'integer', min: 1, max: 200 },
  'security.lockout.attempts': { kind: 'integer', min: 1, max: 100 },
  'security.lockout.minutes': { kind: 'integer', min: 1, max: 1440 },
  'notification.push.devices.max': { kind: 'integer', min: 1, max: 20 },
  'auth.password.reset.minutes': { kind: 'integer', min: 5, max: 1440 },
  'auth.google.autoregister': { kind: 'choice', choices: ['true', 'false'] },
  'dashboard.counters.interval.seconds': { kind: 'integer', min: 5, max: 3600 },
  'status.sla.window.days': { kind: 'integer', min: 1, max: 365 },
  'ratelimit.login.per.minute': { kind: 'integer', min: 1, max: 1000 },
  'ratelimit.incident.create.per.minute': { kind: 'integer', min: 1, max: 1000 },
  'ratelimit.denied.audit.per.minute': { kind: 'integer', min: 1, max: 1000 },
  'audit.seal.interval.seconds': { kind: 'integer', min: 10, max: 86400 },
  'priority.security.category': { kind: 'text', maxLength: 100 },
  'autocat.apply.confidence': { kind: 'decimal', min: 0, max: 1 },
  'problem.correlation.window.minutes': { kind: 'integer', min: 1, max: 10080 },
  'recurring.min.count': { kind: 'integer', min: 2, max: 1000 },
  'recurring.window.days': { kind: 'integer', min: 1, max: 365 },
  'recurring.min.reopens': { kind: 'integer', min: 1, max: 100 },
};

export const metaFor = (key: string): KeyMeta | undefined => KEY_META[key];

/** True for the two-value `true`/`false` keys, shown as a switch. */
export const isBoolean = (m?: KeyMeta) =>
  m?.kind === 'choice' && m.choices.length === 2 && m.choices.includes('true') && m.choices.includes('false');

/** Unit shown beside a numeric value, taken from the key's wording. */
export function unitFor(key: string): string | undefined {
  if (key.endsWith('.percent')) return '% of deadline';
  if (key.endsWith('.seconds')) return 'seconds';
  if (key.endsWith('.minutes')) return 'minutes';
  if (key.endsWith('.hours')) return 'hours';
  if (key.endsWith('.days')) return 'days';
  if (key.endsWith('.per.minute')) return 'per minute';
  return undefined;
}

export interface Group { id: string; title: string; prefixes: string[] }

export const GROUPS: Group[] = [
  { id: 'priority', title: 'Priority', prefixes: ['priority.'] },
  { id: 'assignment', title: 'Assignment', prefixes: ['assignment.'] },
  { id: 'sla', title: 'SLA and business hours', prefixes: ['sla.'] },
  { id: 'escalation', title: 'Escalation', prefixes: ['escalation.'] },
  { id: 'ai', title: 'Duplicates, categorisation and AI', prefixes: ['dup.', 'autocat.', 'ai.', 'embedding.', 'resolution.'] },
  { id: 'security', title: 'Security and rate limits', prefixes: ['security.', 'ratelimit.', 'auth.'] },
  { id: 'notification', title: 'Notifications', prefixes: ['notification.'] },
  { id: 'dashboard', title: 'Dashboard, reports and coverage', prefixes: ['dashboard.', 'status.', 'report.', 'coverage.'] },
  { id: 'audit', title: 'Audit', prefixes: ['audit.'] },
  { id: 'lifecycle', title: 'Incident lifecycle and problems', prefixes: ['verify.', 'reopen.', 'problem.', 'recurring.', 'saved.'] },
];
export const OTHER_GROUP: Group = { id: 'other', title: 'Other', prefixes: [] };

export const groupOf = (key: string): Group => GROUPS.find((g) => g.prefixes.some((p) => key.startsWith(p))) ?? OTHER_GROUP;

export const BUSINESS_KEYS = {
  zone: 'sla.business.zone',
  open: 'sla.business.open',
  close: 'sla.business.close',
  days: 'sla.business.days',
  holidays: 'sla.business.holidays',
} as const;
export const BUSINESS_KEY_SET = new Set<string>(Object.values(BUSINESS_KEYS));

/** Weight keys that must add up to 1.0 (server rule in `AppSettings`, tolerance 0.001). */
export const WEIGHT_SETS: { id: string; title: string; keys: { key: string; label: string }[] }[] = [
  {
    id: 'assignment',
    title: 'Assignment weights',
    keys: [
      { key: 'assignment.weight.skill', label: 'Skill' },
      { key: 'assignment.weight.load', label: 'Load' },
      { key: 'assignment.weight.experience', label: 'Experience' },
      { key: 'assignment.weight.priority', label: 'Priority fit' },
      { key: 'assignment.weight.familiarity', label: 'Familiarity' },
    ],
  },
  {
    id: 'slarisk',
    title: 'SLA risk weights',
    keys: [
      { key: 'sla.risk.weight.elapsed', label: 'Elapsed' },
      { key: 'sla.risk.weight.load', label: 'Load' },
      { key: 'sla.risk.weight.priority', label: 'Priority' },
      { key: 'sla.risk.weight.history', label: 'History' },
    ],
  },
];
export const WEIGHT_TOLERANCE = 0.001;

/** Plain-words names for the assignment strategies. */
export const STRATEGY_LABEL: Record<string, string> = {
  COMPOSITE: 'Weighted mix',
  SKILL: 'Best skill match',
  LOAD: 'Least busy',
  ROUND_ROBIN: 'Round robin',
  EXPERIENCE_PRIORITY: 'Seniority for urgent incidents',
};
export const strategyLabel = (s: string) => STRATEGY_LABEL[s] ?? humanizeEnum(s);

/** What each assignment strategy does (from the backend strategy classes). */
export const STRATEGY_HELP: Record<string, string> = {
  COMPOSITE: 'Weighted mix of skill, load, experience, priority fit and service familiarity (weights below).',
  SKILL: 'Best skill match wins: best proficiency among the required skills, plus coverage.',
  LOAD: 'The least busy eligible technician wins (lowest load relative to their maximum).',
  ROUND_ROBIN: 'Takes turns: the eligible technician whose last assignment is the oldest is next.',
  EXPERIENCE_PRIORITY: 'P1 and P2 go to senior technicians; P3 and P4 to levels 1 to 3, keeping seniors free. Experience breaks ties.',
};

/** Client-side check of one value with the same rules as `ConfigKey.check` for numbers, choices and text. */
export function checkValue(key: string, raw: string): string | null {
  const m = metaFor(key);
  if (!m) return null;
  const v = raw.trim();
  if (m.kind === 'integer' || m.kind === 'decimal') {
    if (v === '' || Number.isNaN(Number(v))) return m.kind === 'integer' ? 'must be a whole number' : 'must be a number';
    const n = Number(v);
    if (m.kind === 'integer' && !Number.isInteger(n)) return 'must be a whole number';
    if (n < m.min || n > m.max) return `must be between ${m.min} and ${m.max}`;
    return null;
  }
  if (m.kind === 'text' && (v.length > m.maxLength || v.includes('\n'))) {
    return `must be one line of at most ${m.maxLength} characters`;
  }
  if (m.kind === 'choice' && !m.choices.includes(v)) return `must be one of ${m.choices.join(', ')}`;
  if (v === '' && m.kind !== 'dates' && m.kind !== 'optional_url') return 'must not be empty';
  return null;
}
