import type { ReportRange } from '../../../api/reports';

const pad = (n: number) => String(n).padStart(2, '0');
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Inclusive range from local midnight `days - 1` days back to the end of today (local time), as ISO-8601
 * date-times: the report endpoints take Instants. Same convention as the Reports page.
 */
export function lastDays(days: number): Required<ReportRange> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return {
    from: new Date(`${toIsoDate(from)}T00:00:00`).toISOString(),
    to: new Date(`${toIsoDate(to)}T23:59:59.999`).toISOString(),
  };
}
