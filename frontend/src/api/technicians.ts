import { api } from './client';
import type { Page, IncidentSummary, IncidentDetail, SlaState } from './types';

export interface Deadline {
  incidentId: number;
  code: string;
  type: 'RESPONSE' | 'RESOLUTION';
  due: string;
  slaState: SlaState;
}

export interface WorkloadView {
  load: number;
  maxLoad: number;
  activeIncidents: number;
  resolvedThisWeek: number;
  upcomingDeadlines: Deadline[];
}

export interface SkillLevel {
  skillId: number;
  name: string;
  proficiency: number;
}

export interface TechnicianView {
  id: number;
  name: string;
  email: string;
  experienceLevel: number;
  escalationLevel: number;
  availability: 'AVAILABLE' | 'AWAY' | 'OFF_DUTY';
  currentLoad: number;
  maxLoad: number;
  activeIncidents: number;
  skills: SkillLevel[];
}

export interface SuggestedResolutionView {
  fromIncidentId: number;
  code: string;
  title: string;
  similarity: number;
  rootCause: string;
  notes: string;
  steps: string;
  reusable: boolean;
}

export interface SimilarIncidentView {
  incidentId: number;
  code: string;
  title: string;
  similarity: number;
  status: string;
  match: 'DUPLICATE' | 'RELATED';
}

export interface ThreadSummaryView {
  summary: string;
  handoverNotes: string[];
  source: 'LLM' | 'KEYWORD' | 'RULE';
}

export interface RiskFactorView {
  name: string;
  contribution: number;
  detail: string;
}

export interface SlaRiskView {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'BREACHED';
  atRisk: boolean;
  threshold: number;
  factors: RiskFactorView[];
}

export interface ResolveIncidentPayload {
  rootCause: string;
  notes: string;
  steps?: string;
  timeSpentMinutes: number;
  reusableSolution?: boolean;
}

// Technician Queue & Workload
export async function getMyQueue(page = 0, size = 20): Promise<Page<IncidentSummary>> {
  const res = await api.get<Page<IncidentSummary>>('/technicians/me/queue', {
    params: { page, size },
  });
  return res.data;
}

export async function getMyWorkload(): Promise<WorkloadView> {
  const res = await api.get<WorkloadView>('/technicians/me/workload');
  return res.data;
}

export async function setMyAvailability(
  availability: 'AVAILABLE' | 'AWAY' | 'OFF_DUTY'
): Promise<TechnicianView> {
  const res = await api.put<TechnicianView>('/technicians/me/availability', { availability });
  return res.data;
}

export async function listTechnicians(skillId?: number, availability?: string): Promise<TechnicianView[]> {
  const res = await api.get<TechnicianView[]>('/technicians', {
    params: { skillId, availability },
  });
  return res.data;
}

// Workbench Actions
export async function acknowledgeIncident(id: number): Promise<IncidentDetail> {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/acknowledge`);
  return res.data;
}

export async function startIncident(id: number): Promise<IncidentDetail> {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/start`);
  return res.data;
}

export async function requestInfo(id: number, message: string): Promise<IncidentDetail> {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/request-info`, { message });
  return res.data;
}

export async function resolveIncident(
  id: number,
  payload: ResolveIncidentPayload
): Promise<IncidentDetail> {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/resolve`, payload);
  return res.data;
}

export async function escalateIncident(id: number, reason: string): Promise<IncidentDetail> {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/escalate`, { reason });
  return res.data;
}

export async function reassignIncident(
  id: number,
  technicianId?: number,
  reason?: string
): Promise<IncidentDetail> {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/reassign`, { technicianId, reason });
  return res.data;
}

// Workbench Helpers
export async function getSuggestedResolutions(id: number): Promise<SuggestedResolutionView[]> {
  const res = await api.get<SuggestedResolutionView[]>(`/incidents/${id}/suggested-resolutions`);
  return res.data;
}

export async function getSimilarIncidents(id: number): Promise<SimilarIncidentView[]> {
  const res = await api.get<SimilarIncidentView[]>(`/incidents/${id}/similar`);
  return res.data;
}

export async function summarizeIncident(id: number): Promise<ThreadSummaryView> {
  const res = await api.post<ThreadSummaryView>(`/incidents/${id}/summary`);
  return res.data;
}

export async function getSlaRisk(id: number): Promise<SlaRiskView> {
  const res = await api.get<SlaRiskView>(`/incidents/${id}/sla-risk`);
  return res.data;
}
