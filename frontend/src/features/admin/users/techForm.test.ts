import { describe, expect, it } from 'vitest';
import { emptyTechForm, isLead, skillRequests, toTechnicianRequest, validateTech } from './techForm';

describe('technician form', () => {
  it('requires experience and max load', () => {
    const e = validateTech(emptyTechForm());
    expect(e.experienceLevel).toBeTruthy();
    expect(e.maxLoad).toBeTruthy();
  });

  it('applies the API limits (experience 1-5, max load 1-50, unique skills)', () => {
    const f = { ...emptyTechForm(), experienceLevel: '6', maxLoad: '51', skills: [{ skillId: '1', proficiency: '3' }, { skillId: '1', proficiency: '2' }] };
    const e = validateTech(f);
    expect(e.experienceLevel).toBeTruthy();
    expect(e.maxLoad).toBeTruthy();
    expect(e.skills).toBeTruthy();
    expect(validateTech({ ...f, experienceLevel: '5', maxLoad: '50', skills: [{ skillId: '1', proficiency: '3' }] })).toEqual({});
  });

  it('builds the TechnicianRequest the API expects', () => {
    const f = { ...emptyTechForm(), experienceLevel: '4', maxLoad: '8', lead: true, skills: [{ skillId: '7', proficiency: '5' }] };
    expect(toTechnicianRequest(f)).toEqual({
      escalationLevel: 1, experienceLevel: 4, maxLoad: 8, availability: 'AVAILABLE', skills: [{ skillId: 7, proficiency: 5 }],
    });
    expect(skillRequests(f)).toEqual([{ skillId: 7, proficiency: 5 }]);
  });

  it('treats escalation level 1 as team lead', () => {
    expect(isLead({ roles: ['EMPLOYEE', 'TECHNICIAN'], technician: { escalationLevel: 1 } })).toBe(true);
    expect(isLead({ roles: ['EMPLOYEE', 'TECHNICIAN'], technician: { escalationLevel: 0 } })).toBe(false);
    expect(isLead({ roles: ['EMPLOYEE'], technician: null })).toBe(false);
  });
});
