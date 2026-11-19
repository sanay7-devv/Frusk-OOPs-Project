import { describe, expect, it } from 'vitest';
import { ACTIVE_STATUSES, dateRange, fromSnapshot, snapshot, tabOf, toApiFilters } from './filters';

const p = (s: string) => new URLSearchParams(s);

describe('incident list filters', () => {
  it('reads serviceId, slaState, status, priority and tab from the URL', () => {
    const f = toApiFilters(p('serviceId=7&slaState=VIOLATED&status=ASSIGNED&priority=P1&tab=all'));
    expect(f).toMatchObject({ serviceId: 7, slaState: 'VIOLATED', status: ['ASSIGNED'], priority: ['P1'], page: 0 });
  });
  it('expands status=ACTIVE to the open statuses', () => {
    expect(toApiFilters(p('status=ACTIVE')).status).toEqual(ACTIVE_STATUSES);
  });
  it('defaults to the all tab and ignores unknown tabs', () => {
    expect(tabOf(p(''))).toBe('all');
    expect(tabOf(p('tab=nope'))).toBe('all');
    expect(tabOf(p('tab=today'))).toBe('today');
  });
  it('maps tabs to a creation date range', () => {
    const now = new Date(2026, 10, 19, 15, 0);
    const start = new Date(2026, 10, 19).toISOString();
    expect(dateRange(p('tab=today'), now)).toEqual({ createdFrom: start });
    expect(dateRange(p('tab=previous'), now)).toEqual({ createdTo: start });
    expect(dateRange(p('tab=all'), now)).toEqual({});
  });
  it('turns manual dates into an inclusive range', () => {
    const r = dateRange(p('from=2026-11-01&to=2026-11-03'));
    expect(r.createdFrom).toBe(new Date(2026, 10, 1).toISOString());
    expect(r.createdTo).toBe(new Date(2026, 10, 4).toISOString());
  });
  it('round-trips a saved view and drops page and open', () => {
    const snap = snapshot(p('serviceId=3&page=4&open=9&priority=P2'));
    expect(snap).toEqual({ serviceId: '3', priority: 'P2' });
    expect(fromSnapshot(snap).toString()).toBe('priority=P2&serviceId=3');
  });
});
