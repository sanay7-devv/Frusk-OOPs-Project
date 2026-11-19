// All incident API calls live here. Components never call axios directly.
import { api } from './client';
import type {
  IncidentDetail,
  IncidentSummary,
  Page,
  AuditEntry,
  RecommendationView,
  SlaViolationView,
  AttachmentView,
  CommentView,
  KnownOutageView,
  StatusBoard,
  WhatIfView,
  UpdateIncidentRequest,
  SavedFilterRequest,
  SavedFilterView,
  SimilarIncidentView,
  PostIncidentReport,
  SlaState,
} from './types';

export type IncidentFilters = Partial<{
  q: string;
  code: string;
  status: string[];
  priority: string[];
  minEscalationLevel?: number;
  categoryId: number;
  serviceId: number;
  assigneeId: number;
  reporterId: number;
  slaState: SlaState | string;
  createdFrom: string;
  createdTo: string;
  mine: boolean;
  assignedToMe: boolean;
  page: number;
  size: number;
  sort: string;
}>;

export const listIncidents = async (f: IncidentFilters = {}): Promise<Page<IncidentSummary>> => {
  const res = await api.get<Page<IncidentSummary>>('/incidents', {
    params: f,
    paramsSerializer: { indexes: null },
  });
  return res.data;
};

export const getIncident = async (id: number): Promise<IncidentDetail> => {
  const res = await api.get<IncidentDetail>(`/incidents/${id}`);
  return res.data;
};

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
  const res = await api.post<IncidentDetail>('/incidents', body);
  return res.data;
};

// Generic action endpoint: acknowledge, start, request-info, provide-info, resolve, verify, close, reopen, reassign, escalate...
export const incidentAction = async (id: number, action: string, body?: unknown) => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/${action}`, body);
  return res.data;
};

export const provideInfo = async (id: number, message: string): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/provide-info`, { message });
  return res.data;
};

export const verifyIncident = async (id: number): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/verify`);
  return res.data;
};

export const reopenIncident = async (id: number, reason: string): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/reopen`, { reason });
  return res.data;
};

export const withdrawIncident = async (id: number, reason: string): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/withdraw`, { reason });
  return res.data;
};

export const submitFeedback = async (id: number, rating: number, comment?: string): Promise<unknown> => {
  const res = await api.post(`/incidents/${id}/feedback`, { rating, comment });
  return res.data;
};

export const getRecommendations = async (id: number): Promise<RecommendationView> => {
  const res = await api.get<RecommendationView>(`/incidents/${id}/recommendations`);
  return res.data;
};

export const assignIncident = async (id: number, technicianId?: number | null): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/assign`, {
    technicianId: technicianId ?? null,
  });
  return res.data;
};

export const getSlaViolations = async (params?: { from?: string; to?: string; page?: number; size?: number }): Promise<Page<SlaViolationView>> => {
  const res = await api.get<Page<SlaViolationView>>('/sla/violations', { params });
  return res.data;
};

export const getHistory = async (id: number): Promise<AuditEntry[]> => {
  const res = await api.get<AuditEntry[]>(`/incidents/${id}/history`);
  return res.data;
};

export const getComments = async (id: number): Promise<CommentView[]> => {
  const res = await api.get<CommentView[]>(`/incidents/${id}/comments`);
  return res.data;
};

export const addComment = async (id: number, body: string, visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC'): Promise<CommentView> => {
  const res = await api.post<CommentView>(`/incidents/${id}/comments`, { body, visibility });
  return res.data;
};

export const updateIncident = async (id: number, body: UpdateIncidentRequest): Promise<IncidentDetail> => {
  const res = await api.put<IncidentDetail>(`/incidents/${id}`, body);
  return res.data;
};

export const markDuplicate = async (id: number, duplicateOfId: number): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/mark-duplicate`, { duplicateOfId });
  return res.data;
};

export const overridePriority = async (id: number, priority: string, reason: string): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/override-priority`, { priority, reason });
  return res.data;
};

export const closeIncident = async (id: number): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/incidents/${id}/close`);
  return res.data;
};

export const listAttachments = async (id: number): Promise<AttachmentView[]> => {
  const res = await api.get<AttachmentView[]>(`/incidents/${id}/attachments`);
  return res.data;
};

export const uploadAttachment = async (id: number, file: File): Promise<AttachmentView> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<AttachmentView>(`/incidents/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const downloadAttachment = async (attachmentId: number): Promise<Blob> => {
  const res = await api.get<Blob>(`/attachments/${attachmentId}/download`, {
    responseType: 'blob',
  });
  return res.data;
};

export const getKnownOutages = async (serviceId?: number): Promise<KnownOutageView[]> => {
  const res = await api.get<KnownOutageView[]>('/problems/known-outages', {
    params: serviceId ? { serviceId } : {},
  });
  return res.data;
};

export const joinProblem = async (problemId: number): Promise<IncidentDetail> => {
  const res = await api.post<IncidentDetail>(`/problems/${problemId}/join`);
  return res.data;
};

export const getServicesStatus = async (): Promise<StatusBoard> => {
  const res = await api.get<StatusBoard>('/services/status');
  return res.data;
};

export const priorityWhatIf = async (body: {
  incidentId?: number;
  serviceId?: number;
  categoryId?: number | null;
  impact: number;
  urgency: number;
  affectedUsers: number;
}): Promise<WhatIfView> => {
  const res = await api.post<WhatIfView>('/priority/what-if', body);
  return res.data;
};

export const listSavedFilters = async (): Promise<SavedFilterView[]> => {
  const res = await api.get<SavedFilterView[]>('/saved-filters');
  return res.data;
};

export const createSavedFilter = async (body: SavedFilterRequest): Promise<SavedFilterView> => {
  const res = await api.post<SavedFilterView>('/saved-filters', body);
  return res.data;
};

export const deleteSavedFilter = async (id: number): Promise<void> => {
  await api.delete(`/saved-filters/${id}`);
};

export const getSimilarIncidents = async (id: number): Promise<SimilarIncidentView[]> => {
  const res = await api.get<SimilarIncidentView[]>(`/incidents/${id}/similar`);
  return res.data;
};

export const getPostIncidentReport = async (id: number): Promise<PostIncidentReport> => {
  const res = await api.get<PostIncidentReport>(`/incidents/${id}/post-incident-report`);
  return res.data;
};

export const downloadPostIncidentReportPdf = async (id: number): Promise<Blob> => {
  const res = await api.get<Blob>(`/incidents/${id}/post-incident-report/pdf`, {
    responseType: 'blob',
  });
  return res.data;
};
