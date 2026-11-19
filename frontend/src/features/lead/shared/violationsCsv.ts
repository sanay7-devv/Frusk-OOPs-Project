import type { SlaViolationView } from '../../../api/types';

// A cell that starts with = + - @ is read as a formula by spreadsheets, so it is prefixed with an apostrophe.
function cell(v: string | number | null | undefined): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const HEADER = ['Violation', 'Incident ID', 'Incident', 'Type', 'Overdue seconds', 'Technician', 'Recorded at (UTC)'];

export function violationsToCsv(rows: SlaViolationView[]): string {
  const lines = rows.map((v) =>
    [v.id, v.incidentId, v.incidentCode, v.type, v.overdueSeconds, v.technician?.name, v.createdAt].map(cell).join(',')
  );
  return [HEADER.map(cell).join(','), ...lines].join('\r\n');
}
