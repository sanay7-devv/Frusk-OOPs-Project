import { describe, expect, it } from 'vitest';
import type { IncidentSummary } from '../api/types';
import { summarizeIncidents } from './incidentSummary';

const record = (overrides: Partial<IncidentSummary> = {}): IncidentSummary => ({ id: 1, code: 'INC-1', title: 'Network issue', status: 'NEW', priority: 'P1', category: null, service: { id: 1, name: 'Network' }, reporter: { id: 1, name: 'Reporter' }, assignee: null, createdAt: '2026-11-15T08:00:00Z', responseDue: null, resolutionDue: null, slaState: 'OK', major: false, escalationLevel: 0, ...overrides });

describe('Incident analysis', () => {
  it('separates completed and waiting work, including verified incidents and unclassified priority', () => {
    const result = summarizeIncidents([record(), record({ status: 'PENDING_USER_INFO', priority: null, assignee: { id: 2, name: 'Technician' } }), record({ status: 'VERIFIED' }), record({ status: 'RESOLVED' }), record({ status: 'CLOSED' })]);
    expect(result).toMatchObject({ total: 5, active: 2, completed: 3, waiting: 1, working: 1, unassigned: 1, priority: { P1: 1, unclassified: 1 } });
    expect(Object.values(result.priority).reduce((a, b) => a + b, 0)).toBe(result.active);
  });
  it('groups by service identity, ranks active backlog and counts recorded SLA violations', () => {
    const result = summarizeIncidents([record({ status: 'CLOSED', slaState: 'VIOLATED' }), record({ id: 2, service: { id: 2, name: 'Network' }, priority: 'P2' }), record({ id: 3, service: { id: 2, name: 'Network' }, priority: 'P1', slaState: 'VIOLATED' })]);
    expect(result.services).toEqual([{ id: 2, name: 'Network', total: 2, open: 2, critical: 1, breached: 1 }, { id: 1, name: 'Network', total: 1, open: 0, critical: 0, breached: 1 }]);
  });
  it('returns empty counts without fabricated rates for an empty dataset', () => {
    expect(summarizeIncidents([])).toMatchObject({ total: 0, active: 0, completed: 0, unassigned: 0, services: [] });
  });
});
