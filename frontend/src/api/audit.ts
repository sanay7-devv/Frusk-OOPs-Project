import { api } from './client';
import type { Page, Ref, IncidentStatus } from './types';

// Values from the contract enum AuditEntryView.action / GET /audit?action=
export const AUDIT_ACTIONS = [
  'INCIDENT_CREATED', 'CLASSIFIED', 'PRIORITY_CALCULATED', 'PRIORITY_CHANGED', 'ASSIGNED', 'REASSIGNED',
  'ACKNOWLEDGED', 'WORK_STARTED', 'INFO_REQUESTED', 'INFO_PROVIDED', 'RESOLVED', 'VERIFIED', 'CLOSED',
  'REOPENED', 'ESCALATED', 'COMMENT_ADDED', 'SLA_WARNING', 'SLA_VIOLATED', 'DUPLICATE_LINKED',
  'LOGIN_FAILED', 'ACCESS_DENIED', 'USER_ROLE_CHANGED', 'CONFIG_CHANGED', 'ATTACHMENT_ADDED',
  'PASSWORD_RESET_REQUESTED', 'PASSWORD_CHANGED', 'MFA_ENABLED', 'MFA_DISABLED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEntryView {
  id: number;
  action: AuditAction;
  actor: Ref | null;
  description: string;
  incidentId?: number | null;
  incidentCode?: string | null;
  previousState?: IncidentStatus | null;
  newState?: IncidentStatus | null;
  timestamp: string;
}

export interface AuditSearchParams {
  page?: number;
  size?: number;
  incidentId?: number;
  actorId?: number;
  action?: AuditAction;
  from?: string; // ISO date-time
  to?: string;
}

export const searchAudit = async (params: AuditSearchParams) =>
  (await api.get<Page<AuditEntryView>>('/audit', { params })).data;

export interface SealProblemView { recordId: number | null; sealId: number | null; problem: string; message: string }
export interface VerifyView {
  intact: boolean;
  sealsChecked: number;
  recordsChecked: number;
  unsealedRecords: number;
  lastSealId: number | null;
  lastSealHash: string | null;
  problemCount: number;
  firstProblem: SealProblemView | null;
  problems: SealProblemView[];
}
export interface SealView {
  id: number; fromId: number; toId: number; recordCount: number; hash: string; prevHash: string | null; createdAt: string;
}

export const verifyAudit = async () => (await api.get<VerifyView>('/audit/verify')).data;

/** Returns null when the server answers 204 (nothing new to seal). */
export const sealAudit = async (): Promise<SealView | null> => {
  const res = await api.post<SealView | ''>('/audit/seal');
  return res.status === 204 || !res.data ? null : (res.data as SealView);
};
