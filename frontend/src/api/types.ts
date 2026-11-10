// Mirrors Appendix C of the handbook. Keep in sync with the OpenAPI file.
export type RoleType = 'EMPLOYEE' | 'TECHNICIAN' | 'ADMINISTRATOR';
export type IncidentStatus = 'NEW'|'CLASSIFIED'|'ASSIGNED'|'ACKNOWLEDGED'|'IN_PROGRESS'|'PENDING_USER_INFO'|'RESOLVED'|'VERIFIED'|'CLOSED'|'REOPENED';
export type Priority = 'P1'|'P2'|'P3'|'P4';
export type SlaState = 'OK'|'WARNING'|'AT_RISK'|'VIOLATED'|'PAUSED'|'MET';
export type IncidentAction = 'EDIT'|'COMMENT'|'ASSIGN'|'ACKNOWLEDGE'|'START_WORK'|'REQUEST_INFO'|'PROVIDE_INFO'|'RESOLVE'|'VERIFY'|'CLOSE'|'REOPEN'|'REASSIGN'|'ESCALATE'|'OVERRIDE_PRIORITY'|'MARK_DUPLICATE'|'GIVE_FEEDBACK';

export interface Ref { id: number; name: string }
export interface CurrentUser {
  id: number; name: string; email: string; roles: RoleType[]; permissions: string[];
  technician: { escalationLevel: 0 | 1; availability: string } | null;
  administrator: { scope: string } | null;
}
export interface AuthResponse { accessToken: string; refreshToken: string; expiresInSeconds: number; user: CurrentUser }

export interface IncidentSummary {
  id: number; code: string; title: string; status: IncidentStatus; priority: Priority | null;
  category: Ref | null; service: Ref; reporter: Ref; assignee: Ref | null;
  createdAt: string; responseDue: string | null; resolutionDue: string | null;
  slaState: SlaState; major: boolean; escalationLevel: number;
}
export interface PriorityBreakdown {
  impact: number; urgency: number; criticality: number; usersMultiplier: number;
  baseScore: number; score: number; band: Priority; overrideRule: string | null;
}
export interface Resolution { rootCause: string; notes: string; steps: string; timeSpentMinutes: number; reusableSolution: boolean; resolvedBy: Ref }
export interface IncidentDetail extends IncidentSummary {
  description: string; impact: number; urgency: number; affectedUsers: number;
  priorityScore: number | null; priorityBreakdown: PriorityBreakdown | null;
  acknowledgedAt: string | null; resolvedAt: string | null; closedAt: string | null;
  closureReason: string | null; problemId: number | null; duplicateOfId: number | null;
  reopenCount: number; pausedAt: string | null; resolution: Resolution | null;
  feedback: { rating: number; comment: string } | null; allowedActions: IncidentAction[];
}
export interface Page<T> { items: T[]; page: number; size: number; totalItems: number; totalPages: number }
export interface ApiError {
  timestamp: string; status: number; code: string; message: string; path: string;
  fieldErrors: { field: string; message: string }[]; similar?: { id: number; code: string; title: string; similarity: number; status: IncidentStatus }[];
}
export interface AppNotification { id: number; eventType: string; title: string; message: string; incidentId: number | null; channel: string; read: boolean; createdAt: string }
