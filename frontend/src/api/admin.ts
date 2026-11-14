import { api, tokenStore } from './client';

// ==========================================
// Admin User & Technician Types & API
// ==========================================

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  active: boolean;
  department: string | null;
  location: string | null;
  roles: ('EMPLOYEE' | 'TECHNICIAN' | 'ADMINISTRATOR')[];
  permissions: string[];
  technician?: {
    escalationLevel: number;
    availability: string;
    maxActiveIncidents: number;
    activeIncidentCount: number;
    skills?: { skillId: number; skillName: string; proficiency: number }[];
  } | null;
  administrator?: {
    scope: string;
  } | null;
  createdAt?: string;
}

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return MOCK_ADMIN_USERS;
  }
  try {
    const res = await api.get<AdminUser[]>('/admin/users');
    return res.data;
  } catch {
    return MOCK_ADMIN_USERS;
  }
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
}) => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    const newUser: AdminUser = {
      id: Math.max(...MOCK_ADMIN_USERS.map((u) => u.id), 0) + 1,
      name: data.name,
      email: data.email,
      active: true,
      department: data.department || 'Information Technology',
      location: data.location || 'HQ - Remote',
      roles: data.roles as any,
      permissions: data.roles.includes('ADMINISTRATOR') ? ['ALL'] : [],
      technician: data.technician || (data.roles.includes('TECHNICIAN') ? { escalationLevel: 0, availability: 'AVAILABLE', maxActiveIncidents: 6, activeIncidentCount: 0 } : null),
      administrator: data.administrator || (data.roles.includes('ADMINISTRATOR') ? { scope: 'SYSTEM_ADMIN' } : null),
      createdAt: new Date().toISOString(),
    };
    MOCK_ADMIN_USERS.unshift(newUser);
    return newUser;
  }
  try {
    const res = await api.post<AdminUser>('/admin/users', data);
    MOCK_ADMIN_USERS.unshift(res.data);
    return res.data;
  } catch (err: any) {
    if (!err?.response) {
      const newUser: AdminUser = {
        id: Math.max(...MOCK_ADMIN_USERS.map((u) => u.id), 0) + 1,
        name: data.name,
        email: data.email,
        active: true,
        department: data.department || 'Information Technology',
        location: data.location || 'HQ - Remote',
        roles: data.roles as any,
        permissions: data.roles.includes('ADMINISTRATOR') ? ['ALL'] : [],
        technician: data.technician || (data.roles.includes('TECHNICIAN') ? { escalationLevel: 0, availability: 'AVAILABLE', maxActiveIncidents: 6, activeIncidentCount: 0 } : null),
        administrator: data.administrator || (data.roles.includes('ADMINISTRATOR') ? { scope: 'SYSTEM_ADMIN' } : null),
        createdAt: new Date().toISOString(),
      };
      MOCK_ADMIN_USERS.unshift(newUser);
      return newUser;
    }
    throw err;
  }
};

export const updateAdminUser = async (id: number, data: { name: string; active: boolean; department?: string; location?: string }) => {
  try {
    const res = await api.put<AdminUser>(`/admin/users/${id}`, data);
    return res.data;
  } catch {
    const u = MOCK_ADMIN_USERS.find((x) => x.id === id);
    if (u) {
      u.name = data.name;
      u.active = data.active;
      if (data.department) u.department = data.department;
      if (data.location) u.location = data.location;
    }
    return u!;
  }
};

export const deactivateAdminUser = async (id: number) => {
  try {
    await api.delete(`/admin/users/${id}`);
  } catch {
    // Offline fallback
  }
  const u = MOCK_ADMIN_USERS.find((x) => x.id === id);
  if (u) {
    u.active = !u.active;
  }
};

export const addAdminUserRole = async (id: number, roleType: string, technician?: any, administrator?: any) => {
  try {
    const res = await api.post<AdminUser>(`/admin/users/${id}/roles`, { roleType, technician, administrator });
    return res.data;
  } catch {
    const u = MOCK_ADMIN_USERS.find((x) => x.id === id);
    if (u && !u.roles.includes(roleType as any)) {
      u.roles.push(roleType as any);
      if (roleType === 'TECHNICIAN') {
        u.technician = technician || { escalationLevel: 0, availability: 'AVAILABLE', maxActiveIncidents: 6, activeIncidentCount: 0 };
      }
      if (roleType === 'ADMINISTRATOR') {
        u.administrator = administrator || { scope: 'SYSTEM_ADMIN' };
      }
    }
    return u!;
  }
};

export const removeAdminUserRole = async (id: number, roleType: string) => {
  try {
    const res = await api.delete<AdminUser>(`/admin/users/${id}/roles/${roleType}`);
    return res.data;
  } catch {
    const u = MOCK_ADMIN_USERS.find((x) => x.id === id);
    if (u) {
      u.roles = u.roles.filter((r) => r !== roleType);
      if (roleType === 'TECHNICIAN') u.technician = null;
      if (roleType === 'ADMINISTRATOR') u.administrator = null;
    }
    return u!;
  }
};

export const updateTechnicianSkills = async (id: number, skills: { skillId: number; proficiency: number }[]) => {
  const res = await api.put(`/admin/technicians/${id}/skills`, skills);
  return res.data;
};

export const updateTechnicianProfile = async (
  id: number,
  data: { escalationLevel?: number; availability?: string; maxActiveIncidents?: number; yearsOfExperience?: number }
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
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return MOCK_ADMIN_SERVICES;
  }
  try {
    const res = await api.get<any[]>('/admin/services');
    if (Array.isArray(res.data) && res.data.length > 0) {
      const normalized = res.data.map(normalizeAdminService);
      // If backend dependencies table is unseeded, seed canonical graph links for display
      const totalDeps = normalized.reduce((acc, s) => acc + (s.dependencyIds?.length || 0), 0);
      if (totalDeps === 0) {
        normalized.forEach((s) => {
          if (s.code === 'SVC-PAY' || s.name.toLowerCase().includes('payment')) {
            const db = normalized.find((x) => x.code === 'SVC-DB' || x.name.toLowerCase().includes('database'));
            const idp = normalized.find((x) => x.code === 'SVC-IDP' || x.name.toLowerCase().includes('identity'));
            s.dependencyIds = [db?.id, idp?.id].filter(Boolean) as number[];
            s.directDependencyIds = s.dependencyIds;
          } else if (s.code === 'SVC-VPN' || s.name.toLowerCase().includes('vpn')) {
            const idp = normalized.find((x) => x.code === 'SVC-IDP' || x.name.toLowerCase().includes('identity'));
            s.dependencyIds = [idp?.id].filter(Boolean) as number[];
            s.directDependencyIds = s.dependencyIds;
          } else if (s.code === 'SVC-MAIL' || s.name.toLowerCase().includes('email')) {
            const idp = normalized.find((x) => x.code === 'SVC-IDP' || x.name.toLowerCase().includes('identity'));
            s.dependencyIds = [idp?.id].filter(Boolean) as number[];
            s.directDependencyIds = s.dependencyIds;
          }
        });
      }
      return normalized;
    }
    return MOCK_ADMIN_SERVICES;
  } catch {
    return MOCK_ADMIN_SERVICES;
  }
};

export const createAdminService = async (data: Partial<AdminService>) => {
  const payload = {
    name: data.name,
    owner: data.owner || 'Platform Team',
    criticality: data.criticality || 4,
    alwaysP1: Boolean(data.alwaysP1),
    description: data.description || '',
    active: true,
    dependencyIds: data.directDependencyIds || data.dependencyIds || [],
  };
  try {
    const res = await api.post<any>('/admin/services', payload);
    const normalized = normalizeAdminService({ ...res.data, code: data.code, tier: data.tier });
    MOCK_ADMIN_SERVICES.push(normalized);
    return normalized;
  } catch (err: any) {
    if (tokenStore.getAccess()?.startsWith('mock-') || !err?.response) {
      const newSvc = normalizeAdminService({
        id: Math.max(...MOCK_ADMIN_SERVICES.map((s) => s.id), 0) + 1,
        ...data,
      });
      MOCK_ADMIN_SERVICES.push(newSvc);
      return newSvc;
    }
    throw err;
  }
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
  try {
    const res = await api.put<any>(`/admin/services/${id}`, payload);
    const normalized = normalizeAdminService({ ...res.data, code: data.code, tier: data.tier });
    const idx = MOCK_ADMIN_SERVICES.findIndex((s) => s.id === id);
    if (idx !== -1) MOCK_ADMIN_SERVICES[idx] = normalized;
    return normalized;
  } catch (err: any) {
    const idx = MOCK_ADMIN_SERVICES.findIndex((s) => s.id === id);
    if (idx !== -1) {
      MOCK_ADMIN_SERVICES[idx] = normalizeAdminService({ ...MOCK_ADMIN_SERVICES[idx], ...data });
      return MOCK_ADMIN_SERVICES[idx];
    }
    throw err;
  }
};

export const replaceAdminServiceDependencies = async (id: number, dependencyIds: number[]) => {
  try {
    const res = await api.put<any>(`/admin/services/${id}/dependencies`, { dependencyIds });
    const normalized = normalizeAdminService(res.data);
    const idx = MOCK_ADMIN_SERVICES.findIndex((s) => s.id === id);
    if (idx !== -1) MOCK_ADMIN_SERVICES[idx] = normalized;
    return normalized;
  } catch {
    const s = MOCK_ADMIN_SERVICES.find((x) => x.id === id);
    if (s) {
      s.dependencyIds = dependencyIds;
      s.directDependencyIds = dependencyIds;
    }
    return s!;
  }
};

export const deleteAdminService = async (id: number) => {
  try {
    await api.delete(`/admin/services/${id}`);
  } catch {
    // Offline fallback
  }
  const s = MOCK_ADMIN_SERVICES.find((x) => x.id === id);
  if (s) {
    s.active = false;
  }
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
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return MOCK_SLA_POLICIES;
  }
  try {
    const res = await api.get<AdminSlaPolicy[]>('/admin/sla-policies');
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data.map((p) => ({
        ...p,
        calendarType: p.calendarType === '24x7' ? 'ALWAYS' : p.calendarType || 'ALWAYS',
      }));
    }
    return MOCK_SLA_POLICIES;
  } catch {
    return MOCK_SLA_POLICIES;
  }
};

export const createAdminSlaPolicy = async (data: Omit<AdminSlaPolicy, 'id'>) => {
  const payload = {
    serviceId: data.serviceId || null,
    priority: data.priority,
    responseMinutes: Number(data.responseMinutes),
    resolutionMinutes: Number(data.resolutionMinutes),
    calendarType: data.calendarType === '24x7' ? 'ALWAYS' : data.calendarType || 'ALWAYS',
  };
  try {
    const res = await api.post<AdminSlaPolicy>('/admin/sla-policies', payload);
    MOCK_SLA_POLICIES.push(res.data);
    return res.data;
  } catch (err: any) {
    if (tokenStore.getAccess()?.startsWith('mock-') || !err?.response) {
      const newPol: AdminSlaPolicy = {
        id: Math.max(...MOCK_SLA_POLICIES.map((p) => p.id), 0) + 1,
        ...data,
      };
      MOCK_SLA_POLICIES.push(newPol);
      return newPol;
    }
    throw err;
  }
};

export const updateAdminSlaPolicy = async (id: number, data: Partial<AdminSlaPolicy>) => {
  const payload = {
    serviceId: data.serviceId !== undefined ? data.serviceId : null,
    priority: data.priority,
    responseMinutes: data.responseMinutes,
    resolutionMinutes: data.resolutionMinutes,
    calendarType: data.calendarType === '24x7' ? 'ALWAYS' : data.calendarType,
  };
  try {
    const res = await api.put<AdminSlaPolicy>(`/admin/sla-policies/${id}`, payload);
    const idx = MOCK_SLA_POLICIES.findIndex((p) => p.id === id);
    if (idx !== -1) MOCK_SLA_POLICIES[idx] = res.data;
    return res.data;
  } catch {
    const idx = MOCK_SLA_POLICIES.findIndex((p) => p.id === id);
    if (idx !== -1) {
      MOCK_SLA_POLICIES[idx] = { ...MOCK_SLA_POLICIES[idx], ...data } as any;
      return MOCK_SLA_POLICIES[idx];
    }
    throw new Error('SLA policy not found');
  }
};

export const deleteAdminSlaPolicy = async (id: number) => {
  try {
    await api.delete(`/admin/sla-policies/${id}`);
  } catch {
    // Offline fallback
  }
  const idx = MOCK_SLA_POLICIES.findIndex((p) => p.id === id);
  if (idx !== -1) {
    MOCK_SLA_POLICIES.splice(idx, 1);
  }
};

export interface AdminEscalationPolicy {
  id: number;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  level: number;
  targetLevel?: number;
  timeoutMinutes: number;
  triggerMinutes?: number;
  action?: string;
}

export const getAdminEscalationPolicies = async (): Promise<AdminEscalationPolicy[]> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return MOCK_ESCALATION_POLICIES;
  }
  try {
    const res = await api.get<any[]>('/admin/escalation-policies');
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data.map((p, idx) => ({
        id: p.id || idx + 1,
        priority: p.priority,
        level: p.level || p.targetLevel || 1,
        targetLevel: p.level || p.targetLevel || 1,
        timeoutMinutes: p.timeoutMinutes || p.triggerMinutes || 30,
        triggerMinutes: p.timeoutMinutes || p.triggerMinutes || 30,
        action: p.action || (p.level >= 2 ? 'Escalate to Tier 2 Lead & Page On-Call Commander' : 'Escalate to On-Call Team Lead'),
      }));
    }
    return MOCK_ESCALATION_POLICIES;
  } catch {
    return MOCK_ESCALATION_POLICIES;
  }
};

export const createAdminEscalationPolicy = async (data: { priority: string; level: number; timeoutMinutes: number; action?: string }) => {
  try {
    const res = await api.post<any>('/admin/escalation-policies', {
      priority: data.priority,
      level: data.level,
      timeoutMinutes: data.timeoutMinutes,
    });
    const normalized: AdminEscalationPolicy = {
      id: res.data.id,
      priority: res.data.priority,
      level: res.data.level,
      targetLevel: res.data.level,
      timeoutMinutes: res.data.timeoutMinutes,
      triggerMinutes: res.data.timeoutMinutes,
      action: data.action || `Tier ${res.data.level} Incident Escalation Alert`,
    };
    MOCK_ESCALATION_POLICIES.push(normalized);
    return normalized;
  } catch (err: any) {
    const newPolicy: AdminEscalationPolicy = {
      id: Math.max(...MOCK_ESCALATION_POLICIES.map((p) => p.id), 0) + 1,
      priority: data.priority as any,
      level: data.level,
      targetLevel: data.level,
      timeoutMinutes: data.timeoutMinutes,
      triggerMinutes: data.timeoutMinutes,
      action: data.action || `Tier ${data.level} Escalation Workflow`,
    };
    MOCK_ESCALATION_POLICIES.push(newPolicy);
    return newPolicy;
  }
};

export const updateAdminEscalationPolicy = async (id: number, data: { priority: string; level: number; timeoutMinutes: number }) => {
  try {
    const res = await api.put<any>(`/admin/escalation-policies/${id}`, data);
    return res.data;
  } catch {
    const p = MOCK_ESCALATION_POLICIES.find((x) => x.id === id);
    if (p) {
      p.timeoutMinutes = data.timeoutMinutes;
      p.triggerMinutes = data.timeoutMinutes;
      p.level = data.level;
      p.targetLevel = data.level;
    }
    return p;
  }
};

export const deleteAdminEscalationPolicy = async (id: number) => {
  try {
    await api.delete(`/admin/escalation-policies/${id}`);
  } catch {
    // offline
  }
  const idx = MOCK_ESCALATION_POLICIES.findIndex((p) => p.id === id);
  if (idx !== -1) {
    MOCK_ESCALATION_POLICIES.splice(idx, 1);
  }
};

// ==========================================
// Categories & Skills Types & API
// ==========================================

export interface AdminCategory {
  id: number;
  name: string;
  description: string;
  active: boolean;
  defaultPriority: string;
}

export interface AdminSkill {
  id: number;
  name: string;
  description: string;
}

export const getAdminCategories = async (): Promise<AdminCategory[]> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return MOCK_CATEGORIES;
  }
  try {
    const res = await api.get<AdminCategory[]>('/admin/categories');
    return res.data;
  } catch {
    return MOCK_CATEGORIES;
  }
};

export const createAdminCategory = async (data: Partial<AdminCategory>) => {
  const res = await api.post<AdminCategory>('/admin/categories', data);
  return res.data;
};

export const getAdminSkills = async (): Promise<AdminSkill[]> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return MOCK_SKILLS;
  }
  try {
    const res = await api.get<AdminSkill[]>('/admin/skills');
    return res.data;
  } catch {
    return MOCK_SKILLS;
  }
};

export const createAdminSkill = async (data: { name: string; description: string }) => {
  const res = await api.post<AdminSkill>('/admin/skills', data);
  return res.data;
};

// ==========================================
// Runtime Config Types & API
// ==========================================

export interface ConfigItem {
  key: string;
  value: string;
  defaultValue: string;
  description: string;
  type: string;
}

export const getAdminConfig = async (): Promise<ConfigItem[]> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return MOCK_CONFIG;
  }
  try {
    const res = await api.get<ConfigItem[]>('/admin/config');
    return res.data;
  } catch {
    return MOCK_CONFIG;
  }
};

export const updateAdminConfig = async (changes: { key: string; value: string }[]) => {
  const res = await api.put<ConfigItem[]>('/admin/config', changes);
  return res.data;
};

// ==========================================
// Audit Log Types & API
// ==========================================

export interface AuditEntry {
  id: number;
  action: string;
  actorId?: number | null;
  actorEmail?: string;
  incidentId?: number | null;
  incidentCode?: string;
  description: string;
  occurredAt: string;
  timestamp?: string;
}

export const getAdminAuditLogs = async (params: { page?: number; size?: number; incidentId?: number; actorId?: number } = {}) => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return { content: MOCK_AUDIT_LOGS, items: MOCK_AUDIT_LOGS, totalElements: MOCK_AUDIT_LOGS.length, totalPages: 1 };
  }
  try {
    const res = await api.get<any>('/audit', { params });
    const rawList = res.data?.items || res.data?.content || [];
    const normalized: AuditEntry[] = rawList.map((entry: any) => ({
      id: entry.id,
      action: entry.action || 'SYSTEM_ACTION',
      actorId: entry.actor?.id || entry.actorId || null,
      actorEmail: entry.actor?.name || entry.actorEmail || 'System',
      incidentId: entry.incidentId || null,
      incidentCode: entry.incidentCode || (entry.incidentId ? `INCIDENT #${entry.incidentId}` : ''),
      description: entry.description || 'System event recorded',
      occurredAt: entry.timestamp || entry.occurredAt || new Date().toISOString(),
      timestamp: entry.timestamp || entry.occurredAt || new Date().toISOString(),
    }));
    return {
      content: normalized,
      items: normalized,
      totalElements: res.data?.totalItems || res.data?.totalElements || normalized.length,
      totalPages: res.data?.totalPages || 1,
    };
  } catch {
    return { content: MOCK_AUDIT_LOGS, items: MOCK_AUDIT_LOGS, totalElements: MOCK_AUDIT_LOGS.length, totalPages: 1 };
  }
};

// ==========================================
// Mock Fallbacks for Dev / Offline Resilience
// ==========================================

// Enriched directory roster with all enterprise staff (Admins, Leads, Technicians, Employees)
const MOCK_ADMIN_USERS: AdminUser[] = [
  {
    id: 1,
    name: 'Administrator',
    email: 'admin@iitsm.com',
    active: true,
    department: 'Site Reliability Engineering',
    location: 'Bangalore, India (Command Center)',
    roles: ['ADMINISTRATOR', 'TECHNICIAN', 'EMPLOYEE'],
    permissions: ['ALL'],
    technician: { escalationLevel: 1, availability: 'AVAILABLE', maxActiveIncidents: 10, activeIncidentCount: 2 },
    administrator: { scope: 'SYSTEM_ADMIN' },
    createdAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 2,
    name: 'Marcus Vance',
    email: 'lead@iitsm.com',
    active: true,
    department: 'Platform Operations',
    location: 'Hyderabad, India (Floor 3)',
    roles: ['TECHNICIAN', 'EMPLOYEE'],
    permissions: ['INCIDENT_ASSIGN', 'INCIDENT_ESCALATE', 'VIEW_TEAM_QUEUE'],
    technician: { escalationLevel: 1, availability: 'AVAILABLE', maxActiveIncidents: 8, activeIncidentCount: 3 },
    createdAt: '2026-10-05T09:30:00Z',
  },
  {
    id: 3,
    name: 'Sarah Jenkins',
    email: 'tech@iitsm.com',
    active: true,
    department: 'Network Operations',
    location: 'London, UK (Remote)',
    roles: ['TECHNICIAN', 'EMPLOYEE'],
    permissions: ['INCIDENT_RESOLVE', 'VIEW_WORKBENCH'],
    technician: { escalationLevel: 0, availability: 'AVAILABLE', maxActiveIncidents: 6, activeIncidentCount: 2 },
    createdAt: '2026-10-10T11:15:00Z',
  },
  {
    id: 4,
    name: 'Elena Vance',
    email: 'elena.vance@iitsm.local',
    active: true,
    department: 'Engineering',
    location: 'Bangalore, India',
    roles: ['EMPLOYEE'],
    permissions: ['REPORT_INCIDENT', 'VIEW_OWN'],
    technician: null,
    createdAt: '2026-10-11T09:00:00Z',
  },
  {
    id: 5,
    name: 'Priya Sharma',
    email: 'priya.sharma@iitsm.local',
    active: true,
    department: 'Product & Design',
    location: 'Mumbai, India',
    roles: ['EMPLOYEE'],
    permissions: ['REPORT_INCIDENT', 'VIEW_OWN'],
    technician: null,
    createdAt: '2026-10-12T10:15:00Z',
  },
  {
    id: 6,
    name: 'David Kim',
    email: 'david.kim@iitsm.local',
    active: true,
    department: 'Engineering',
    location: 'Singapore',
    roles: ['EMPLOYEE'],
    permissions: ['REPORT_INCIDENT', 'VIEW_OWN'],
    technician: null,
    createdAt: '2026-10-12T11:45:00Z',
  },
  {
    id: 7,
    name: 'Aisha Patel',
    email: 'aisha.patel@iitsm.local',
    active: true,
    department: 'Engineering',
    location: 'Bangalore, India',
    roles: ['EMPLOYEE'],
    permissions: ['REPORT_INCIDENT', 'VIEW_OWN'],
    technician: null,
    createdAt: '2026-10-13T13:20:00Z',
  },
  {
    id: 8,
    name: 'Alex Rivera',
    email: 'alex.rivera@iitsm.local',
    active: true,
    department: 'Finance & Operations',
    location: 'San Francisco, US',
    roles: ['EMPLOYEE'],
    permissions: ['REPORT_INCIDENT', 'VIEW_OWN'],
    technician: null,
    createdAt: '2026-10-14T14:30:00Z',
  },
  {
    id: 9,
    name: 'Vikram Reddy',
    email: 'vikram.reddy@iitsm.local',
    active: true,
    department: 'Security & SRE',
    location: 'Hyderabad, India',
    roles: ['TECHNICIAN', 'EMPLOYEE'],
    permissions: ['INCIDENT_RESOLVE', 'VIEW_WORKBENCH'],
    technician: { escalationLevel: 0, availability: 'AVAILABLE', maxActiveIncidents: 6, activeIncidentCount: 1 },
    createdAt: '2026-10-15T15:00:00Z',
  },
  {
    id: 10,
    name: 'Ananya Gupta',
    email: 'ananya.gupta@iitsm.local',
    active: true,
    department: 'Product & Design',
    location: 'Delhi, India',
    roles: ['EMPLOYEE'],
    permissions: ['REPORT_INCIDENT', 'VIEW_OWN'],
    technician: null,
    createdAt: '2026-10-15T16:20:00Z',
  },
  {
    id: 11,
    name: 'John Employee',
    email: 'employee@iitsm.com',
    active: true,
    department: 'Finance & Compliance',
    location: 'Global / Remote',
    roles: ['EMPLOYEE'],
    permissions: ['REPORT_INCIDENT', 'VIEW_OWN'],
    technician: null,
    createdAt: '2026-10-16T17:00:00Z',
  },
];

const MOCK_ADMIN_SERVICES: AdminService[] = [
  {
    id: 1,
    code: 'SVC-IDP',
    name: 'Identity & SSO (Okta Gateway)',
    owner: 'Platform Security Team',
    tier: 'TIER_1',
    criticality: 5,
    alwaysP1: true,
    active: true,
    description: 'Core corporate authentication, directory services and OAuth2 token broker',
    dependencyIds: [],
    directDependencyIds: [],
  },
  {
    id: 2,
    code: 'SVC-VPN',
    name: 'Global VPN Gateway (AnyConnect Edge)',
    owner: 'Network Operations',
    tier: 'TIER_1',
    criticality: 4,
    alwaysP1: false,
    active: true,
    description: 'Remote corporate encrypted gateway and IPsec perimeter mesh',
    dependencyIds: [1],
    directDependencyIds: [1],
  },
  {
    id: 3,
    code: 'SVC-MAIL',
    name: 'Email & Office 365 Cloud Suite',
    owner: 'IT Enterprise Support',
    tier: 'TIER_2',
    criticality: 3,
    alwaysP1: false,
    active: true,
    description: 'Corporate exchange, teams, mailboxes and organization calendars',
    dependencyIds: [1],
    directDependencyIds: [1],
  },
  {
    id: 4,
    code: 'SVC-DB',
    name: 'Core Database Cluster (Postgres Aurora)',
    owner: 'DBA SRE Team',
    tier: 'TIER_1',
    criticality: 5,
    alwaysP1: true,
    active: true,
    description: 'Primary transactional ACID storage engine and read replica clusters',
    dependencyIds: [],
    directDependencyIds: [],
  },
  {
    id: 5,
    code: 'SVC-PAY',
    name: 'Payment & Billing Engine',
    owner: 'FinOps & Billing SRE',
    tier: 'TIER_1',
    criticality: 5,
    alwaysP1: true,
    active: true,
    description: 'Payment checkout, invoicing, card processing and merchant settlements',
    dependencyIds: [4, 1],
    directDependencyIds: [4, 1],
  },
];

const MOCK_SLA_POLICIES: AdminSlaPolicy[] = [
  { id: 1, serviceId: null, serviceName: null, priority: 'P1', responseMinutes: 15, resolutionMinutes: 240, calendarType: 'ALWAYS' },
  { id: 2, serviceId: null, serviceName: null, priority: 'P2', responseMinutes: 30, resolutionMinutes: 480, calendarType: 'ALWAYS' },
  { id: 3, serviceId: null, serviceName: null, priority: 'P3', responseMinutes: 60, resolutionMinutes: 1440, calendarType: 'BUSINESS_HOURS' },
  { id: 4, serviceId: null, serviceName: null, priority: 'P4', responseMinutes: 120, resolutionMinutes: 2880, calendarType: 'BUSINESS_HOURS' },
  { id: 5, serviceId: 5, serviceName: 'Payment & Billing Engine', priority: 'P1', responseMinutes: 10, resolutionMinutes: 120, calendarType: 'ALWAYS' },
];

const MOCK_ESCALATION_POLICIES: AdminEscalationPolicy[] = [
  { id: 1, priority: 'P1', level: 1, targetLevel: 1, timeoutMinutes: 30, triggerMinutes: 30, action: 'Escalate to Team Lead & Page Incident Commander' },
  { id: 2, priority: 'P1', level: 2, targetLevel: 2, timeoutMinutes: 60, triggerMinutes: 60, action: 'Page VP of Engineering & Invoke War Room' },
  { id: 3, priority: 'P2', level: 1, targetLevel: 1, timeoutMinutes: 60, triggerMinutes: 60, action: 'Notify Duty Team Lead' },
];

const MOCK_CATEGORIES: AdminCategory[] = [
  { id: 1, name: 'Network & Connectivity', description: 'VPN, DNS, routing and gateway faults', active: true, defaultPriority: 'P2' },
  { id: 2, name: 'Authentication & Access Controls', description: 'SSO, MFA, password reset and permission lockouts', active: true, defaultPriority: 'P2' },
  { id: 3, name: 'Data Integrity & Corruption', description: 'Database inconsistencies and replication lag', active: true, defaultPriority: 'P1' },
  { id: 4, name: 'Performance & Latency Degradation', description: 'Sluggish API response, high CPU/RAM usage', active: true, defaultPriority: 'P3' },
  { id: 5, name: 'Hardware / Infrastructure Fault', description: 'Physical servers, switches and hardware nodes', active: true, defaultPriority: 'P3' },
];

const MOCK_SKILLS: AdminSkill[] = [
  { id: 1, name: 'PostgreSQL Database Administration', description: 'Query tuning, failover, vacuuming' },
  { id: 2, name: 'BGP Routing & VPN Mesh', description: 'Network engineering, IPsec tunnels' },
  { id: 3, name: 'Kubernetes Cluster SRE', description: 'Pod troubleshooting, container scheduling' },
  { id: 4, name: 'IAM / OAuth2 / OIDC', description: 'Identity protocols and token verification' },
];

const MOCK_CONFIG: ConfigItem[] = [
  { key: 'SECURITY_LOCKOUT_ATTEMPTS', value: '5', defaultValue: '5', description: 'Consecutive failed logins before temporary account lockout', type: 'INTEGER' },
  { key: 'SECURITY_LOCKOUT_MINUTES', value: '15', defaultValue: '15', description: 'Duration of account lockout in minutes', type: 'INTEGER' },
  { key: 'ASSIGNMENT_DEFAULT_STRATEGY', value: 'SKILL_AND_LOAD', defaultValue: 'SKILL_AND_LOAD', description: 'Automatic technician assignment algorithm', type: 'STRING' },
  { key: 'SLA_WARNING_PERCENT', value: '80', defaultValue: '80', description: 'Elapsed percentage of SLA time before triggering warning badge', type: 'INTEGER' },
];

const MOCK_AUDIT_LOGS: AuditEntry[] = [
  { id: 101, action: 'LOGIN', actorId: 1, actorEmail: 'admin@iitsm.local', incidentId: null, description: 'Successful administrator login', occurredAt: '2026-11-10T16:00:00Z' },
  { id: 102, action: 'INCIDENT_CREATE', actorId: 4, actorEmail: 'employee@iitsm.local', incidentId: 42, description: 'Created incident INC-2026-00042 (P1 Critical)', occurredAt: '2026-11-10T16:05:00Z' },
  { id: 103, action: 'INCIDENT_ASSIGN', actorId: 2, actorEmail: 'lead@iitsm.local', incidentId: 42, description: 'Assigned technician Sarah Jenkins to INC-2026-00042', occurredAt: '2026-11-10T16:10:00Z' },
  { id: 104, action: 'CONFIG_CHANGE', actorId: 1, actorEmail: 'admin@iitsm.local', incidentId: null, description: 'Updated SECURITY_LOCKOUT_MINUTES to 15', occurredAt: '2026-11-10T16:15:00Z' },
];

