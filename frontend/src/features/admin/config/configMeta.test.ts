import { describe, expect, it } from 'vitest';
import { checkValue, groupOf, isBoolean, metaFor, unitFor } from './configMeta';

describe('configMeta', () => {
  it('checks numbers against the server range', () => {
    expect(checkValue('sla.warn.first.percent', '75')).toBeNull();
    expect(checkValue('sla.warn.first.percent', '100')).toBe('must be between 1 and 99');
    expect(checkValue('sla.monitor.interval.seconds', '1.5')).toBe('must be a whole number');
    expect(checkValue('assignment.weight.skill', '')).toBe('must be a number');
  });
  it('checks choices and allows empty optional values', () => {
    expect(checkValue('assignment.strategy', 'LOAD')).toBeNull();
    expect(checkValue('assignment.strategy', 'RANDOM')).toContain('must be one of');
    expect(checkValue('notification.chat.webhook.url', '')).toBeNull();
    expect(checkValue('notification.email.from', '')).toBe('must not be empty');
  });
  it('groups keys by prefix and falls back to Other', () => {
    expect(groupOf('sla.business.zone').id).toBe('sla');
    expect(groupOf('ratelimit.login.per.minute').id).toBe('security');
    expect(groupOf('brand.new.key').id).toBe('other');
  });
  it('knows switches and units', () => {
    expect(isBoolean(metaFor('auth.google.autoregister'))).toBe(true);
    expect(isBoolean(metaFor('assignment.strategy'))).toBe(false);
    expect(unitFor('escalation.exhausted.minutes')).toBe('minutes');
    expect(unitFor('priority.band.p1')).toBeUndefined();
  });
});
