import type { ReportRange } from '../../../api/reports';

/**
 * Inclusive range from local midnight `days - 1` days back to the end of today (local time), as ISO-8601
 * date-times: the report endpoints take Instants. Same convention as the Reports page.
 */
export function lastDays(days: number): Required<ReportRange> {
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const to = new Date();
  to.setHours(23, 59, 59, 999);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}
