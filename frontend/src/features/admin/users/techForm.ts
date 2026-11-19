import type { Availability } from '../../../api/types';
import type { SkillLevelRequest, TechnicianProfileView, TechnicianRequest } from '../../../api/adminDirectory';

export const AVAILABILITIES: Availability[] = ['AVAILABLE', 'BUSY', 'AWAY', 'OFF_DUTY'];
export const EXPERIENCE_LABELS: Record<number, string> = { 1: 'Junior', 2: 'Associate', 3: 'Mid-level', 4: 'Senior', 5: 'Expert' };
export const PROFICIENCY_LABELS: Record<number, string> = { 1: 'Basic', 2: 'Working', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' };
export const MAX_LOAD_MIN = 1;
export const MAX_LOAD_MAX = 50;

export interface TechForm {
  experienceLevel: string;
  maxLoad: string;
  availability: Availability;
  /** escalationLevel 1 (team lead) when true, 0 when false. */
  lead: boolean;
  skills: { skillId: string; proficiency: string }[];
}

export const emptyTechForm = (): TechForm => ({ experienceLevel: '', maxLoad: '', availability: 'AVAILABLE', lead: false, skills: [] });

export const techFormFrom = (p: TechnicianProfileView): TechForm => ({
  experienceLevel: String(p.experienceLevel),
  maxLoad: String(p.maxLoad),
  availability: p.availability,
  lead: p.escalationLevel >= 1,
  skills: p.skills.map((s) => ({ skillId: String(s.skillId), proficiency: String(s.proficiency) })),
});

/** Same limits as the backend (TechnicianRequest / SkillLevelRequest). Keys match the API field names. */
export function validateTech(f: TechForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const exp = Number(f.experienceLevel);
  if (!f.experienceLevel || !Number.isInteger(exp) || exp < 1 || exp > 5) errors.experienceLevel = 'Pick a level from 1 to 5';
  const load = Number(f.maxLoad);
  if (!f.maxLoad || !Number.isInteger(load) || load < MAX_LOAD_MIN || load > MAX_LOAD_MAX) {
    errors.maxLoad = `Whole number from ${MAX_LOAD_MIN} to ${MAX_LOAD_MAX}`;
  }
  const seen = new Set<string>();
  for (const s of f.skills) {
    if (!s.skillId || !s.proficiency) errors.skills = 'Every skill row needs a skill and a proficiency';
    else if (seen.has(s.skillId)) errors.skills = 'A skill can be listed only once';
    seen.add(s.skillId);
  }
  return errors;
}

export const skillRequests = (f: TechForm): SkillLevelRequest[] =>
  f.skills.map((s) => ({ skillId: Number(s.skillId), proficiency: Number(s.proficiency) }));

export const toTechnicianRequest = (f: TechForm): TechnicianRequest => ({
  escalationLevel: f.lead ? 1 : 0,
  experienceLevel: Number(f.experienceLevel),
  maxLoad: Number(f.maxLoad),
  availability: f.availability,
  skills: skillRequests(f),
});

export const isLead = (u: { roles: string[]; technician: { escalationLevel: number } | null }) =>
  u.roles.includes('TECHNICIAN') && (u.technician?.escalationLevel ?? 0) >= 1;
