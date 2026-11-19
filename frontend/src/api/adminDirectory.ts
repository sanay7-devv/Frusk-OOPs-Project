// Exact-shape admin calls for users, technicians, services and SLA policies (iitsm-api.json).
// Kept apart from api/admin.ts, whose older helpers other screens still use.
import { api } from './client';
import type { Availability } from './types';

// ---------------------------------------------------------------- users and technicians

export type DirectoryRole = 'EMPLOYEE' | 'TECHNICIAN' | 'ADMINISTRATOR';
export type AdminScope = 'SYSTEM_ADMIN' | 'IT_MANAGER';

export interface SkillLevelView { skillId: number; name: string; proficiency: number }

/** TechnicianView. */
export interface TechnicianProfileView {
  id: number;
  name: string;
  email: string;
  experienceLevel: number;
  /** 0 = technician, 1 = team lead (the API accepts 0 or 1 only). */
  escalationLevel: number;
  availability: Availability;
  currentLoad: number;
  maxLoad: number;
  activeIncidents: number;
  skills: SkillLevelView[];
}

/** AdminUserView. */
export interface DirectoryUser {
  id: number;
  name: string;
  email: string;
  active: boolean;
  department: string | null;
  location: string | null;
  roles: DirectoryRole[];
  technician: TechnicianProfileView | null;
  administrator: { scope: AdminScope } | null;
}

export interface SkillLevelRequest { skillId: number; proficiency: number }

/** TechnicianRequest (create user, add role). */
export interface TechnicianRequest {
  escalationLevel: number;
  experienceLevel: number;
  maxLoad?: number;
  availability?: Availability;
  skills?: SkillLevelRequest[];
}

/** UpdateTechnicianRequest. */
export interface UpdateTechnicianRequest {
  escalationLevel?: number;
  experienceLevel?: number;
  maxLoad?: number;
  availability?: Availability;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  department?: string;
  location?: string;
  roles: DirectoryRole[];
  technician?: TechnicianRequest;
  administrator?: { scope: AdminScope };
}

export interface UpdateUserRequest { name?: string; active?: boolean; department?: string; location?: string }

export const listDirectoryUsers = async () => (await api.get<DirectoryUser[]>('/admin/users')).data;
export const getDirectoryUser = async (id: number) => (await api.get<DirectoryUser>(`/admin/users/${id}`)).data;
export const createDirectoryUser = async (body: CreateUserRequest) => (await api.post<DirectoryUser>('/admin/users', body)).data;
export const updateDirectoryUser = async (id: number, body: UpdateUserRequest) =>
  (await api.put<DirectoryUser>(`/admin/users/${id}`, body)).data;
export const resetUserMfa = async (id: number) => { await api.post(`/admin/users/${id}/mfa/reset`); };
export const grantRole = async (id: number, body: { roleType: DirectoryRole; technician?: TechnicianRequest; administrator?: { scope: AdminScope } }) =>
  (await api.post<DirectoryUser>(`/admin/users/${id}/roles`, body)).data;
export const revokeRole = async (id: number, roleType: DirectoryRole) =>
  (await api.delete<DirectoryUser>(`/admin/users/${id}/roles/${roleType}`)).data;
export const updateTechnicianProfileExact = async (id: number, body: UpdateTechnicianRequest) =>
  (await api.put<TechnicianProfileView>(`/admin/technicians/${id}`, body)).data;
export const replaceTechnicianSkills = async (id: number, skills: SkillLevelRequest[]) =>
  (await api.put<TechnicianProfileView>(`/admin/technicians/${id}/skills`, skills)).data;

// ---------------------------------------------------------------- services

/** ServiceView / ServiceRequest. */
export interface ServiceRecord {
  id: number;
  name: string;
  owner: string | null;
  description: string | null;
  criticality: number;
  alwaysP1: boolean;
  active: boolean;
  dependencyIds: number[];
}

export interface ServiceInput {
  name: string;
  owner?: string;
  description?: string;
  criticality: number;
  alwaysP1: boolean;
  active: boolean;
  dependencyIds?: number[];
}

export const listServiceRecords = async () => (await api.get<ServiceRecord[]>('/admin/services')).data;
export const getServiceRecord = async (id: number) => (await api.get<ServiceRecord>(`/admin/services/${id}`)).data;
export const createServiceRecord = async (body: ServiceInput) => (await api.post<ServiceRecord>('/admin/services', body)).data;
export const updateServiceRecord = async (id: number, body: ServiceInput) =>
  (await api.put<ServiceRecord>(`/admin/services/${id}`, body)).data;
export const retireServiceRecord = async (id: number) => { await api.delete(`/admin/services/${id}`); };

// ---------------------------------------------------------------- SLA policies

export type SlaCalendar = 'ALWAYS' | 'BUSINESS_HOURS';

/** SlaPolicyView / SlaPolicyRequest. */
export interface SlaPolicyRecord {
  id: number;
  serviceId: number | null;
  serviceName: string | null;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  responseMinutes: number;
  resolutionMinutes: number;
  calendarType: SlaCalendar;
}

export interface SlaPolicyInput {
  serviceId: number | null;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  responseMinutes: number;
  resolutionMinutes: number;
  calendarType: SlaCalendar;
}

export const listSlaPolicyRecords = async () => (await api.get<SlaPolicyRecord[]>('/admin/sla-policies')).data;
export const createSlaPolicyRecord = async (body: SlaPolicyInput) => (await api.post<SlaPolicyRecord>('/admin/sla-policies', body)).data;
export const updateSlaPolicyRecord = async (id: number, body: SlaPolicyInput) =>
  (await api.put<SlaPolicyRecord>(`/admin/sla-policies/${id}`, body)).data;
export const deleteSlaPolicyRecord = async (id: number) => { await api.delete(`/admin/sla-policies/${id}`); };
