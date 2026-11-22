/** One date and enum format for the whole app, e.g. "21 Nov 2026, 00:24". */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

function toDate(v: string | number | Date | null | undefined): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(v: string | number | Date | null | undefined, fallback = 'Not yet'): string {
  const d = toDate(v);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : fallback;
}

export function formatTime(v: string | number | Date | null | undefined, fallback = 'Not yet'): string {
  const d = toDate(v);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : fallback;
}

export function formatTimeSeconds(v: string | number | Date | null | undefined, fallback = 'Not yet'): string {
  const d = toDate(v);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : fallback;
}

export function formatDateTime(v: string | number | Date | null | undefined, fallback = 'Not yet'): string {
  const d = toDate(v);
  return d ? `${formatDate(d)}, ${formatTime(d)}` : fallback;
}

export function formatDateHour(v: string | number | Date | null | undefined, fallback = 'Not yet'): string {
  const d = toDate(v);
  return d ? `${formatDate(d)}, ${pad(d.getHours())}:00` : fallback;
}

/** Compact elapsed time for user-facing durations. Long spans use days instead of three-digit hours. */
export function formatDurationMinutes(value: number | null | undefined, fallback = 'No data'): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  const minutes = Math.max(0, Math.round(value));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  return `${minutes}m`;
}

export const formatDurationSeconds = (seconds: number | null | undefined, fallback = 'No data') =>
  seconds == null ? fallback : formatDurationMinutes(seconds / 60, fallback);

export const formatDurationMs = (milliseconds: number | null | undefined, fallback = 'No data') =>
  milliseconds == null ? fallback : formatDurationMinutes(milliseconds / 60_000, fallback);

const ACRONYMS = new Set(['SLA', 'AI', 'LLM', 'ID', 'IT', 'PDF', 'CSV', 'API', 'TOTP', 'VIP', 'P1', 'P2', 'P3', 'P4', 'TF', 'IDF']);

/** "SLA_VIOLATED" -> "SLA violated"; keeps acronyms upper case. */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return '';
  const words = value.replace(/[_\-\s]+/g, ' ').trim().split(' ').filter(Boolean);
  const out = words.map((w, i) => {
    const up = w.toUpperCase();
    if (up === 'TFIDF') return 'TF-IDF';
    if (ACRONYMS.has(up)) return up;
    const lower = w.toLowerCase();
    return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
  });
  return out.join(' ').replace(/TF IDF/, 'TF-IDF');
}

/** "elapsedTime" -> "Elapsed time". */
export function humanizeCamel(value: string): string {
  const s = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "day" / "days" with the right number. */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
