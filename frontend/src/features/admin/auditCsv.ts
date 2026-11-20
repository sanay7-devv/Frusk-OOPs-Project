import type { AuditEntryView } from '../../api/audit';
import { searchAuditActions, type AuditQuery } from './auditSearch';

/** The API caps a page at 100 (AuditController @Max(100)). */
const PAGE_SIZE = 100;
/** Safety stop so one click cannot pull the whole trail; the caller is told when it applies. */
export const CSV_MAX_ROWS = 5000;

export interface AuditCsvResult {
  blob: Blob;
  rows: number;
  total: number;
  truncated: boolean;
}

// A cell that starts with = + - @ is read as a formula by spreadsheets; descriptions are user-influenced text.
function cell(v: string | number | null | undefined): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const HEADER = ['Record', 'Time (UTC)', 'Action', 'Actor ID', 'Actor', 'Incident ID', 'Incident', 'From status', 'To status', 'Description'];

export function auditToCsv(rows: AuditEntryView[]): string {
  const lines = rows.map((e) =>
    [
      e.id,
      e.timestamp,
      e.action,
      e.actor?.id,
      e.actor?.name,
      e.incidentId,
      e.incidentCode,
      e.previousState,
      e.newState,
      e.description,
    ]
      .map(cell)
      .join(',')
  );
  return [HEADER.map(cell).join(','), ...lines].join('\r\n');
}

/** Every record that matches the filters (all pages, up to CSV_MAX_ROWS), as a CSV file. */
export async function exportAuditCsv(params: Omit<AuditQuery, 'page' | 'size'>): Promise<AuditCsvResult> {
  const rows: AuditEntryView[] = [];
  let total = 0;
  for (let page = 0; rows.length < CSV_MAX_ROWS; page++) {
    const res = await searchAuditActions({ ...params, page, size: PAGE_SIZE });
    total = res.totalItems;
    rows.push(...res.items);
    if (page + 1 >= res.totalPages) break;
  }
  const kept = rows.slice(0, CSV_MAX_ROWS);
  const blob = new Blob(['﻿' + auditToCsv(kept)], { type: 'text/csv;charset=utf-8' });
  return { blob, rows: kept.length, total, truncated: kept.length < total };
}
