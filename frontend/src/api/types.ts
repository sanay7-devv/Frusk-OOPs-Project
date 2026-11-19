// Mirrors Appendix C of the handbook. Keep in sync with the OpenAPI file.
export type RoleType = 'EMPLOYEE' | 'TECHNICIAN' | 'ADMINISTRATOR';
export type IncidentStatus = 'NEW'|'CLASSIFIED'|'ASSIGNED'|'ACKNOWLEDGED'|'IN_PROGRESS'|'PENDING_USER_INFO'|'RESOLVED'|'VERIFIED'|'CLOSED'|'REOPENED';
export type Priority = 'P1'|'P2'|'P3'|'P4';
export type SlaState = 'OK'|'WARNING'|'AT_RISK'|'VIOLATED'|'PAUSED'|'MET';
export type IncidentAction = 'EDIT'|'COMMENT'|'ASSIGN'|'ACKNOWLEDGE'|'START_WORK'|'REQUEST_INFO'|'PROVIDE_INFO'|'RESOLVE'|'VERIFY'|'CLOSE'|'REOPEN'|'REASSIGN'|'ESCALATE'|'OVERRIDE_PRIORITY'|'MARK_DUPLICATE'|'GIVE_FEEDBACK'|'WITHDRAW';
export type Availability = 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFF_DUTY';
export type ClosureReason = 'VERIFIED' | 'AUTO_VERIFIED' | 'DUPLICATE' | 'WITHDRAWN';
export type NotificationEventType =
  | 'INCIDENT_CREATED'
  | 'INCIDENT_ASSIGNED'
  | 'INCIDENT_ACKNOWLEDGED'
  | 'INFO_REQUESTED'
  | 'INFO_PROVIDED'
  | 'WORK_STARTED'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_VERIFIED'
  | 'INCIDENT_REOPENED'
  | 'INCIDENT_CLOSED'
  | 'INCIDENT_ESCALATED'
  | 'SLA_WARNING'
  | 'SLA_VIOLATED'
  | 'MAJOR_INCIDENT_DECLARED'
  | 'OUTAGE_DECLARED';
export type NotificationChannel = 'EMAIL' | 'IN_APP' | 'SLACK' | 'SMS' | 'PUSH' | 'WEBHOOK';

export interface Ref { id: number; name: string }
export interface CurrentUser {
  id: number; name: string; email: string; roles: RoleType[]; permissions: string[];
  technician: { escalationLevel: number; availability: Availability | string } | null;
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
export interface EscalationPreview {
  kind: string;
  fromLevel: number;
  toLevel: number;
  targetRole: string;
  dueAt: string;
  secondsRemaining: number;
  recipients: Ref[];
}

export interface AttachmentView {
  id: number;
  incidentId: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: Ref;
}

export interface CommentView {
  id: number;
  incidentId: number;
  author: Ref;
  body: string;
  visibility: 'PUBLIC' | 'INTERNAL';
  createdAt: string;
}

export interface KnownOutageView {
  problemId: number;
  title: string;
  service: Ref;
  leadPriority: Priority;
  leadCode: string;
  since: string;
  affectedUsers: number;
  alreadyJoined: boolean;
}

export interface ServiceStatus {
  id: number;
  name: string;
  criticality: number;
  status: 'OUTAGE' | 'DEGRADED' | 'HEALTHY';
  reason?: string;
  open?: { total: number; P1: number; P2: number; P3: number; P4: number };
  slaCompliancePercent?: number;
  slaJudged?: number;
}

export interface StatusBoard {
  generatedAt: string;
  windowDays: number;
  basis: string;
  label: string;
  services: ServiceStatus[];
}

export interface Scenario {
  impact: number;
  urgency: number;
  affectedUsers: number;
  score: number;
  priority: Priority;
  overrideRule?: string | null;
}

export interface WhatIfView {
  incident?: Ref;
  incidentCode?: string;
  service?: Ref;
  category?: Ref;
  current?: Scenario;
  whatIf?: Scenario;
  scoreDifference?: number;
  changed?: boolean;
}

export interface UpdateIncidentRequest {
  description?: string;
  impact?: number;
  urgency?: number;
  affectedUsers?: number;
  version?: number;
}

export interface IncidentDetail extends IncidentSummary {
  description: string; impact: number; urgency: number; affectedUsers: number;
  priorityScore: number | null; priorityBreakdown: PriorityBreakdown | null;
  acknowledgedAt: string | null; resolvedAt: string | null; closedAt: string | null;
  closureReason: ClosureReason | null;
  problemId: number | null; duplicateOfId: number | null;
  reopenCount: number; pausedAt: string | null; resolution: Resolution | null;
  feedback: { rating: number; comment: string; createdAt?: string } | null; allowedActions: IncidentAction[];
  escalationPreview?: EscalationPreview | null;
  version?: number;
}
export interface Page<T> { items: T[]; page: number; size: number; totalItems: number; totalPages: number }
export interface ApiError {
  timestamp: string; status: number; code: string; message: string; path: string;
  fieldErrors: { field: string; message: string }[]; similar?: { id: number; code: string; title: string; similarity: number; status: IncidentStatus; match?: string; source?: string }[];
}
export interface AppNotification { id: number; eventType: NotificationEventType | string; title: string; message: string; incidentId: number | null; channel: NotificationChannel | string; read: boolean; createdAt: string }

export interface AuditEntry {
  id: number;
  timestamp: string;
  actor: Ref;
  action: string;
  incidentCode: string;
  incidentId?: number;
  previousState: IncidentStatus | null;
  newState: IncidentStatus | null;
  description: string;
}

export interface RecommendedTechnician {
  technicianId: number;
  name: string;
  score: number;
  currentLoad: number;
  maxLoad: number;
  reasons: string[];
  factors: Record<string, number>;
}

export interface ExcludedTechnician {
  technicianId: number;
  name: string;
  reason: string;
}

export interface RecommendationView {
  strategy: string;
  recommendations: RecommendedTechnician[];
  excluded: ExcludedTechnician[];
}

export interface SlaViolationView {
  id: number;
  incidentId: number;
  incidentCode: string;
  type: string;
  overdueSeconds: number;
  technician: Ref | null;
  createdAt: string;
}

export interface SavedFilterRequest {
  name: string;
  filter: Record<string, any>;
}

export interface SavedFilterView {
  id: number;
  name: string;
  filter: Record<string, any>;
  createdAt?: string;
}

export interface SimilarIncidentView {
  incidentId: number;
  code: string;
  title: string;
  similarity: number;
  status: IncidentStatus;
  match?: 'DUPLICATE' | 'RELATED';
  source?: 'LLM' | 'KEYWORD' | 'EMBEDDING';
}

export interface PostIncidentReport {
  incidentId: number;
  code: string;
  title: string;
  status: IncidentStatus;
  priority: Priority;
  service?: Ref;
  category?: Ref;
  satisfaction?: number;
  reopenCount?: number;
  createdAt: string;
  resolvedAt?: string;
  closedAt?: string;
  totalSeconds?: number;
  complete?: boolean;
  generatedAt: string;
  resolution?: {
    rootCause?: string;
    notes?: string;
    steps?: string;
    resolvedBy?: Ref;
    timeSpentMinutes?: number;
  };
  timeline?: Array<{
    timestamp: string;
    action: string;
    actor?: Ref;
    description: string;
  }>;
}
