import type { ReportRange } from '../../../api/reports';

const pad = (n: number) => String(n).padStart(2, '0');
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Inclusive range ending today (23:59:59.999Z) and starting `days - 1` days back (00:00:00.000Z).
 * Returns ISO-8601 date-time strings required by Spring Boot's Instant parameter binding.
 */
export function lastDays(days: number): Required<ReportRange> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return {
    from: new Date(`${toIsoDate(from)}T00:00:00.000Z`).toISOString(),
    to: new Date(`${toIsoDate(to)}T23:59:59.999Z`).toISOString(),
  };
}
