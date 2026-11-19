import { describe, expect, it } from 'vitest';
import { violationsToCsv } from './violationsCsv';

describe('violationsToCsv', () => {
  it('writes a header, one row per violation and neutralises formula cells', () => {
    const csv = violationsToCsv([
      { id: 1, incidentId: 7, incidentCode: 'INC-7', type: 'RESOLUTION', overdueSeconds: 90, technician: { id: 2, name: '=cmd' }, createdAt: '2026-11-19T10:00:00Z' },
      { id: 2, incidentId: 8, incidentCode: 'INC-8', type: 'RESPONSE', overdueSeconds: 5, technician: null, createdAt: '2026-11-19T11:00:00Z' },
    ]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('"Incident"');
    expect(lines[1]).toContain('"\'=cmd"');
    expect(lines[2]).toContain('""');
  });
});
