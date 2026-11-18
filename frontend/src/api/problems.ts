// Problem records / Major Incident Mode (staff side). Shapes follow the OpenAPI contract:
// ProblemView, RootCauseView, CauseView, RecurringView, CreateProblemRequest, ResolveRequest.
// The employee side (known outages, join) stays in api/incidents.ts.
import { api } from './client';
import type { IncidentSummary, Ref } from './types';

export type ProblemStatus = 'OPEN' | 'RESOLVED';

export interface ProblemView {
  id: number;
  title: string;
  service: Ref | null;
  status: ProblemStatus;
  createdAt: string;
  lead: IncidentSummary | null;
  incidentCount: number;
  /** People who joined the outage with one click (POST /problems/{id}/join). */
  joined: number;
  incidents: IncidentSummary[];
}

export interface CauseView {
  service: Ref;
  maxDistance: number;
  totalDistance: number;
  affected: boolean;
  paths: Ref[][];
}

export interface RootCauseView {
  problemId: number;
  probable: CauseView | null;
  candidates: CauseView[];
  affectedServices: Ref[];
  explanation: string;
}

export interface RecurringView {
  kind: 'REPEATED_FIX' | 'REPEATED_REOPEN';
  service: Ref | null;
  category: Ref | null;
  count: number;
  incidents: IncidentSummary[];
  reason: string;
}

export interface CreateProblemRequest {
  title?: string;
  incidentIds: number[];
}

/** Same body as resolving one incident. The backend ignores reusableSolution here, so it is not sent. */
export interface ResolveProblemRequest {
  rootCause: string;
  notes: string;
  steps?: string;
  timeSpentMinutes: number;
}

export const listProblems = async (status?: ProblemStatus): Promise<ProblemView[]> => {
  const res = await api.get<ProblemView[]>('/problems', { params: status ? { status } : {} });
  return res.data;
};

export const getProblem = async (id: number): Promise<ProblemView> => {
  const res = await api.get<ProblemView>(`/problems/${id}`);
  return res.data;
};

export const createProblem = async (body: CreateProblemRequest): Promise<ProblemView> => {
  const res = await api.post<ProblemView>('/problems', body);
  return res.data;
};

export const getRootCause = async (id: number): Promise<RootCauseView> => {
  const res = await api.get<RootCauseView>(`/problems/${id}/root-cause`);
  return res.data;
};

export const resolveProblem = async (id: number, body: ResolveProblemRequest): Promise<ProblemView> => {
  const res = await api.post<ProblemView>(`/problems/${id}/resolve`, body);
  return res.data;
};

export const removeIncidentFromProblem = async (id: number, incidentId: number): Promise<ProblemView> => {
  const res = await api.delete<ProblemView>(`/problems/${id}/incidents/${incidentId}`);
  return res.data;
};

export const getRecurringProblems = async (): Promise<RecurringView[]> => {
  const res = await api.get<RecurringView[]>('/problems/recurring');
  return res.data;
};
