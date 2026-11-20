import { api } from './client';
import type { DirectoryUser } from './adminDirectory';

// ==========================================
// Admin User & Technician Types & API
// ==========================================

/** The contract `AdminUserView`, exactly as in `adminDirectory.ts` (no extra fields). */
export type AdminUser = DirectoryUser;

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  const res = await api.get<AdminUser[]>('/admin/users');
  return res.data;
};

export const createAdminUser = async (data: {
  name: string;
  email: string;
  password?: string;
  department?: string;
  location?: string;
  roles: string[];
  technician?: any;
  administrator?: any;
}): Promise<AdminUser> => {
  const res = await api.post<AdminUser>('/admin/users', data);
  return res.data;
};

export const updateAdminUser = async (id: number, data: { name: string; active: boolean; department?: string; location?: string }): Promise<AdminUser> => {
  const res = await api.put<AdminUser>(`/admin/users/${id}`, data);
  return res.data;
};

export const deactivateAdminUser = async (id: number): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};

export const addAdminUserRole = async (id: number, roleType: string, technician?: any, administrator?: any): Promise<AdminUser> => {
  const res = await api.post<AdminUser>(`/admin/users/${id}/roles`, { roleType, technician, administrator });
  return res.data;
};

export const removeAdminUserRole = async (id: number, roleType: string): Promise<AdminUser> => {
  const res = await api.delete<AdminUser>(`/admin/users/${id}/roles/${roleType}`);
  return res.data;
};

export const updateTechnicianSkills = async (id: number, skills: { skillId: number; proficiency: number }[]) => {
  const res = await api.put(`/admin/technicians/${id}/skills`, skills);
  return res.data;
};

export const updateTechnicianProfile = async (
  id: number,
  data: { escalationLevel?: number; availability?: string; maxActiveIncidents?: number; yearsOfExperience?: number; experienceLevel?: string; maxLoad?: number }
) => {
  const res = await api.put(`/admin/technicians/${id}`, data);
  return res.data;
};

// ==========================================
// Admin Service Catalog Types & API
// ==========================================

export interface AdminService {
  id: number;
  code: string;
  name: string;
  owner?: string;
  description: string;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | string;
  criticality: number;
  alwaysP1: boolean;
  active: boolean;
  dependencyIds?: number[];
  directDependencyIds?: number[];
}

export function deriveServiceCode(name: string, id: number): string {
  const n = (name || '').toLowerCase();
  if (n.includes('database') || n.includes('aurora') || n.includes('postgres') || n.includes('sql')) return 'SVC-DB';
  if (n.includes('identity') || n.includes('sso') || n.includes('okta') || n.includes('auth')) return 'SVC-IDP';
  if (n.includes('vpn') || n.includes('anyconnect') || (n.includes('gateway') && n.includes('network'))) return 'SVC-VPN';
  if (n.includes('email') || n.includes('office') || n.includes('365') || n.includes('mail')) return 'SVC-MAIL';
  if (n.includes('payment') || n.includes('billing') || n.includes('checkout')) return 'SVC-PAY';
  if (n.includes('k8s') || n.includes('kubernetes') || n.includes('cluster')) return 'SVC-K8S';
  if (n.includes('dns') || n.includes('domain')) return 'SVC-DNS';
  if (n.includes('cloud') || n.includes('aws') || n.includes('azure')) return 'SVC-CLOUD';

  const words = (name || '').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const acronym = words.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
    return `SVC-${acronym}`;
  }
  return `SVC-${String((name || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 4) || id).toUpperCase()}`;
}

export function deriveServiceTier(criticality: number, alwaysP1: boolean): 'TIER_1' | 'TIER_2' | 'TIER_3' {
  if (criticality >= 5 || alwaysP1) return 'TIER_1';
  if (criticality >= 3) return 'TIER_2';
  return 'TIER_3';
}

export function normalizeAdminService(raw: any): AdminService {
  const criticality = Number(raw.criticality) || 3;
  const alwaysP1 = Boolean(raw.alwaysP1);
  const code = raw.code || deriveServiceCode(raw.name, raw.id);
  const tier = raw.tier || deriveServiceTier(criticality, alwaysP1);
  const deps = Array.isArray(raw.dependencyIds)
    ? raw.dependencyIds
    : Array.isArray(raw.directDependencyIds)
    ? raw.directDependencyIds
    : [];

  return {
    id: raw.id,
    code,
    name: raw.name || 'Unnamed Service',
    owner: raw.owner || (criticality >= 5 ? 'Core Platform SRE' : 'IT Operations'),
    description: raw.description || '',
    tier,
    criticality,
    alwaysP1,
    active: raw.active !== false,
    dependencyIds: deps,
    directDependencyIds: deps,
  };
}

export const getAdminServices = async (): Promise<AdminService[]> => {
  const res = await api.get<any[]>('/admin/services');
  return (res.data || []).map(normalizeAdminService);
};

export const createAdminService = async (data: Omit<AdminService, 'id'>) => {
  const payload = {
    name: data.name,
    owner: data.owner,
    criticality: data.criticality,
    alwaysP1: data.alwaysP1,
    description: data.description,
    active: data.active,
    dependencyIds: data.directDependencyIds || data.dependencyIds || [],
  };
  const res = await api.post<any>('/admin/services', payload);
  return normalizeAdminService({ ...res.data, code: data.code, tier: data.tier });
};

export const updateAdminService = async (id: number, data: Partial<AdminService>) => {
  const payload = {
    name: data.name,
    owner: data.owner,
    criticality: data.criticality,
    alwaysP1: data.alwaysP1,
    description: data.description,
    active: data.active,
    dependencyIds: data.directDependencyIds || data.dependencyIds,
  };
  const res = await api.put<any>(`/admin/services/${id}`, payload);
  return normalizeAdminService({ ...res.data, code: data.code, tier: data.tier });
};

export const replaceAdminServiceDependencies = async (id: number, dependencyIds: number[]) => {
  const res = await api.put<any>(`/admin/services/${id}/dependencies`, { dependencyIds });
  return normalizeAdminService(res.data);
};

export const deleteAdminService = async (id: number) => {
  await api.delete(`/admin/services/${id}`);
};

// ==========================================
// Admin SLA & Escalation Types & API
// ==========================================

export interface AdminSlaPolicy {
  id: number;
  serviceId: number | null;
  serviceName?: string | null;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  responseMinutes: number;
  resolutionMinutes: number;
  calendarType: 'ALWAYS' | 'BUSINESS_HOURS' | string;
}

export const getAdminSlaPolicies = async (): Promise<AdminSlaPolicy[]> => {
  const res = await api.get<AdminSlaPolicy[]>('/admin/sla-policies');
  return (res.data || []).map((p) => ({
    ...p,
    calendarType: p.calendarType === '24x7' ? 'ALWAYS' : p.calendarType || 'ALWAYS',
  }));
};

export const createAdminSlaPolicy = async (data: Omit<AdminSlaPolicy, 'id'>) => {
  const payload = {
    serviceId: data.serviceId || null,
    priority: data.priority,
    responseMinutes: Number(data.responseMinutes),
    resolutionMinutes: Number(data.resolutionMinutes),
    calendarType: data.calendarType === '24x7' ? 'ALWAYS' : data.calendarType || 'ALWAYS',
  };
  const res = await api.post<AdminSlaPolicy>('/admin/sla-policies', payload);
  return res.data;
};

export const updateAdminSlaPolicy = async (id: number, data: Partial<AdminSlaPolicy>) => {
  const payload = {
    serviceId: data.serviceId !== undefined ? data.serviceId : null,
    priority: data.priority,
    responseMinutes: data.responseMinutes,
    resolutionMinutes: data.resolutionMinutes,
    calendarType: data.calendarType === '24x7' ? 'ALWAYS' : data.calendarType,
  };
  const res = await api.put<AdminSlaPolicy>(`/admin/sla-policies/${id}`, payload);
  return res.data;
};

export const deleteAdminSlaPolicy = async (id: number) => {
  await api.delete(`/admin/sla-policies/${id}`);
};

export interface AdminEscalationPolicy {
  id: number;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  /** 1 Team Lead, 2 System Admin, 3 IT Manager. */
  level: number;
  /** Minutes an incident may stay unacknowledged at the previous level before it moves up to this level. */
  timeoutMinutes: number;
  /** Not part of the API contract; kept optional only for older callers. */
  targetLevel?: number;
  triggerMinutes?: number;
  action?: string;
}

export const getAdminEscalationPolicies = async (): Promise<AdminEscalationPolicy[]> => {
  const res = await api.get<AdminEscalationPolicy[]>('/admin/escalation-policies');
  return res.data;
};

export const createAdminEscalationPolicy = async (data: { priority: string; level: number; timeoutMinutes: number; action?: string }) => {
  const res = await api.post<AdminEscalationPolicy>('/admin/escalation-policies', {
    priority: data.priority,
    level: data.level,
    timeoutMinutes: data.timeoutMinutes,
  });
  return res.data;
};

export const updateAdminEscalationPolicy = async (id: number, data: { priority: string; level: number; timeoutMinutes: number }) => {
  const res = await api.put<AdminEscalationPolicy>(`/admin/escalation-policies/${id}`, data);
  return res.data;
};

export const deleteAdminEscalationPolicy = async (id: number) => {
  await api.delete(`/admin/escalation-policies/${id}`);
};

// ==========================================
// Categories & Skills Types & API
// ==========================================

export interface AdminCategory {
  id: number;
  name: string;
  parentId?: number | null;
  requiredSkillIds?: number[];
  active: boolean;
}

export interface AdminSkill {
  id: number;
  name: string;
}

export interface AdminCategoryInput {
  name: string;
  parentId: number | null;
  requiredSkillIds: number[];
  active: boolean;
}

export const getAdminCategories = async (): Promise<AdminCategory[]> => {
  const res = await api.get<AdminCategory[]>('/admin/categories');
  return res.data;
};

export const createAdminCategory = async (data: AdminCategoryInput) => {
  const res = await api.post<AdminCategory>('/admin/categories', data);
  return res.data;
};

export const updateAdminCategory = async (id: number, data: AdminCategoryInput) => {
  const res = await api.put<AdminCategory>(`/admin/categories/${id}`, data);
  return res.data;
};

export const deactivateAdminCategory = async (id: number) => {
  await api.delete(`/admin/categories/${id}`);
};

export const getAdminSkills = async (): Promise<AdminSkill[]> => {
  const res = await api.get<AdminSkill[]>('/admin/skills');
  return res.data;
};

export const createAdminSkill = async (data: { name: string }) => {
  const res = await api.post<AdminSkill>('/admin/skills', { name: data.name });
  return res.data;
};

export const renameAdminSkill = async (id: number, name: string) => {
  const res = await api.put<AdminSkill>(`/admin/skills/${id}`, { name });
  return res.data;
};

export const deleteAdminSkill = async (id: number) => {
  await api.delete(`/admin/skills/${id}`);
};

// ==========================================
// Runtime Config Types & API
// ==========================================

export interface ConfigItem {
  key: string;
  value: string;
  defaultValue: string;
  description: string;
}

export const getAdminConfig = async (): Promise<ConfigItem[]> => {
  const res = await api.get<ConfigItem[]>('/admin/config');
  return res.data;
};

export const updateAdminConfig = async (changes: { key: string; value: string }[]) => {
  const res = await api.put<ConfigItem[]>('/admin/config', changes);
  return res.data;
};
