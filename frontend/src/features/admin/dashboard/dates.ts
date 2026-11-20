import type { ReportRange } from '../../../api/reports';

/** Inclusive range ending today and starting `days - 1` days back (days = 1 gives today only). */
export function lastDays(days: number): Required<ReportRange> {
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  return { from: from.toISOString(), to: to.toISOString() };
}
