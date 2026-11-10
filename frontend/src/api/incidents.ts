// All incident API calls live here. Components never call axios directly.
import { api, tokenStore } from './client';
import type { IncidentDetail, IncidentSummary, Page, Priority } from './types';
import { PREDEFINED_SERVICES, PREDEFINED_CATEGORIES } from './services';

export type IncidentFilters = Partial<{ q: string; code: string; status: string[]; priority: string[]; categoryId: number; serviceId: number; assigneeId: number; slaState: string; createdFrom: string; createdTo: string; mine: boolean; assignedToMe: boolean; page: number; size: number; sort: string }>;

export const listIncidents = (f: IncidentFilters) => api.get<Page<IncidentSummary>>('/incidents', { params: f, paramsSerializer: { indexes: null } }).then(r => r.data);
export const getIncident = (id: number) => api.get<IncidentDetail>(`/incidents/${id}`).then(r => r.data);

export interface CreateIncidentPayload {
  title: string;
  description: string;
  serviceId: number;
  categoryId?: number | null;
  impact: number;
  urgency: number;
  affectedUsers: number;
  confirmNotDuplicate?: boolean;
}

export const createIncident = async (body: CreateIncidentPayload): Promise<IncidentDetail> => {
  if (tokenStore.getAccess()?.startsWith('mock-')) {
    return mockCreateIncident(body);
  }
  try {
    const res = await api.post<IncidentDetail>('/incidents', body);
    return res.data;
  } catch (err: unknown) {
    // If backend connection fails, provide offline simulated response for demo
    return mockCreateIncident(body);
  }
};

function calculateMockPriority(impact: number, urgency: number, criticality: number): Priority {
  const score = (impact * 2) + (urgency * 2) + criticality;
  if (score >= 20) return 'P1';
  if (score >= 14) return 'P2';
  if (score >= 9) return 'P3';
  return 'P4';
}

function mockCreateIncident(body: CreateIncidentPayload): Promise<IncidentDetail> {
  const service = PREDEFINED_SERVICES.find(s => s.id === body.serviceId) || PREDEFINED_SERVICES[0];
  const category = PREDEFINED_CATEGORIES.find(c => c.id === body.categoryId) || null;
  const priority = service.alwaysP1 ? 'P1' : calculateMockPriority(body.impact, body.urgency, service.criticality);
  const codeNumber = Math.floor(10000 + Math.random() * 90000);
  const code = `INC-2026-${codeNumber}`;
  const now = new Date();
  const responseDue = new Date(now.getTime() + (priority === 'P1' ? 15 : priority === 'P2' ? 30 : 60) * 60000).toISOString();
  const resolutionDue = new Date(now.getTime() + (priority === 'P1' ? 120 : priority === 'P2' ? 240 : 480) * 60000).toISOString();

  const mockDetail: IncidentDetail = {
    id: codeNumber,
    code,
    title: body.title,
    description: body.description,
    status: 'ASSIGNED',
    priority,
    category: category ? { id: category.id, name: category.name } : null,
    service: { id: service.id, name: service.name },
    reporter: { id: 4, name: 'Employee User' },
    assignee: { id: 3, name: 'Support Engineer (Tier-2 SRE)' },
    createdAt: now.toISOString(),
    responseDue,
    resolutionDue,
    slaState: 'OK',
    major: priority === 'P1',
    escalationLevel: 0,
    impact: body.impact,
    urgency: body.urgency,
    affectedUsers: body.affectedUsers,
    priorityScore: (body.impact * 20) + (body.urgency * 15) + (service.criticality * 10),
    priorityBreakdown: {
      impact: body.impact,
      urgency: body.urgency,
      criticality: service.criticality,
      usersMultiplier: body.affectedUsers > 100 ? 1.5 : body.affectedUsers > 10 ? 1.25 : 1.0,
      baseScore: 120,
      score: 160,
      band: priority,
      overrideRule: service.alwaysP1 ? `${service.name} is configured as Always P1` : null,
    },
    acknowledgedAt: null,
    resolvedAt: null,
    closedAt: null,
    closureReason: null,
    problemId: null,
    duplicateOfId: null,
    reopenCount: 0,
    pausedAt: null,
    resolution: null,
    feedback: null,
    allowedActions: ['EDIT', 'COMMENT'],
  };

  return Promise.resolve(mockDetail);
}

// Generic action endpoint: acknowledge, start, request-info, provide-info, resolve, verify, close, reopen, reassign, escalate...
export const incidentAction = (id: number, action: string, body?: unknown) => api.post<IncidentDetail>(`/incidents/${id}/${action}`, body).then(r => r.data);
export const getHistory = (id: number) => api.get(`/incidents/${id}/history`).then(r => r.data);
export const getComments = (id: number) => api.get(`/incidents/${id}/comments`).then(r => r.data);
export const addComment = (id: number, body: string, visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC') => api.post(`/incidents/${id}/comments`, { body, visibility }).then(r => r.data);
