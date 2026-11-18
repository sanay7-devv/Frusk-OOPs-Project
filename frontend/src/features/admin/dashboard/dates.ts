import type { ReportRange } from '../../../api/reports';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Inclusive range ending today and starting `days - 1` days back (days = 1 gives today only). */
export function lastDays(days: number): Required<ReportRange> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: iso(from), to: iso(to) };
}
