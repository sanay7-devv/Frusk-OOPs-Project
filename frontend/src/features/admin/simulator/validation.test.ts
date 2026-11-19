import { describe, expect, it } from 'vitest';
import { hasErrors, toRequest, validateRun, type RunDraft } from './validation';

const base = (): RunDraft => ({
  lastIncidents: '100', speedUp: '1',
  configs: [{ key: 1, name: '', strategy: 'COMPOSITE', technicians: '', weights: { skill: '0.35', load: '0.25', experience: '0.15', priorityFit: '0.1', familiarity: '0.15' } }],
});

describe('simulator validation', () => {
  it('accepts the live defaults and builds the request', () => {
    const d = base();
    expect(hasErrors(validateRun(d))).toBe(false);
    const r = toRequest(d);
    expect(r.configurations?.[0].name).toBe('Configuration 1');
    expect(r.configurations?.[0].technicians).toBeUndefined();
    expect(r.configurations?.[0].weights?.skill).toBe(0.35);
  });
  it('enforces the backend limits', () => {
    const d = base();
    d.lastIncidents = '9'; d.speedUp = '21'; d.configs[0].technicians = '51'; d.configs[0].weights.skill = '0.5';
    const e = validateRun(d);
    expect(e.lastIncidents).toBeDefined();
    expect(e.speedUp).toBeDefined();
    expect(e.configs[0].technicians).toBeDefined();
    expect(e.configs[0].weightSum).toMatch(/add up to 1.0/);
  });
  it('rejects duplicate names', () => {
    const d = base();
    d.configs.push({ ...d.configs[0], key: 2, name: 'Configuration 1' });
    expect(validateRun(d).configs[1].name).toBeDefined();
  });
});
