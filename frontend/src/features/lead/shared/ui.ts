import type { QueryClient } from '@tanstack/react-query';
import { tokens } from '../../../theme/theme';

/** Colour names the lead and admin-detail screens use, all taken from the shared theme tokens. */
export const COLORS = {
  surface: tokens.background,
  surfaceContainerLowest: tokens.surfaceContainerLowest,
  surfaceContainerLow: tokens.surfaceContainerLow,
  surfaceContainer: tokens.surfaceContainer,
  surfaceContainerHigh: tokens.surfaceContainerHigh,
  surfaceContainerHighest: tokens.surfaceContainerHighest,
  onSurface: tokens.onSurface,
  onSurfaceVariant: tokens.onSurfaceVariant,
  border: tokens.outlineVariant,
  primary: tokens.primary,
  secondary: tokens.secondary,
  // Status colours are not in `tokens`; they match the MUI palette in theme.ts.
  error: tokens.danger,
  warning: tokens.warning,
  success: tokens.success,
} as const;

export const MONO = 'JetBrains Mono, monospace';

export const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: COLORS.surfaceContainerLowest,
    color: COLORS.onSurface,
    borderRadius: 2,
    '& fieldset': { borderColor: COLORS.border },
  },
  '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
} as const;

export const dialogPaperSx = {
  bgcolor: COLORS.surfaceContainer,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 3,
  color: COLORS.onSurface,
} as const;

export const MIN_REASON = 10;
export const MAX_REASON = 1000;

/** Date and time, so a ticket from yesterday is not shown as just a clock time. */
export const fmtDateTime = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-';

/**
 * After any change to one incident, refresh every list and detail that can show it:
 * the shared ['incidents', ...] keys plus the lead, admin and technician screens' own keys.
 */
export function invalidateIncidentCaches(qc: QueryClient) {
  const keys = [
    'incidents',
    'incident-detail',
    'incident-history',
    'incident-comments',
    'incident-attachments',
    'incident-recommendations',
    'incident-service-impact',
    'lead-team-queue',
    'lead-escalated-incidents',
    'lead-escalated-detail',
    'lead-at-risk',
    'lead-sla-violations',
    'lead-incident-detail',
    'lead-recommendations',
    'lead-technicians-list',
    'lead-escalation-history',
    'incident-sla-risk',
    'admin-incident-detail',
    'admin-incident-comments',
    'admin-incident-history',
    'admin-incident-attachments',
    'admin-incident-recommendations',
    'admin-incidents-all',
    'admin-incidents-kpi',
    'admin-tickets',
    'dashboard-live',
    'tech-my-queue',
    'tech-my-workload',
    'problems',
  ];
  for (const k of keys) qc.invalidateQueries({ queryKey: [k] });
}

export const STRATEGY_INFO: Record<string, { label: string; text: string }> = {
  COMPOSITE: {
    label: 'Composite',
    text: 'Blends skill match, current load, experience, priority fit and familiarity with the service, using the weights an administrator set in Config.',
  },
  SKILL: { label: 'Skill', text: 'Ranks technicians only by how well their skills match the incident category.' },
  LOAD: { label: 'Load', text: 'Ranks technicians by who has the most spare capacity right now.' },
  ROUND_ROBIN: { label: 'Round robin', text: 'Takes eligible technicians in turn, so work is shared evenly regardless of skill.' },
  EXPERIENCE_PRIORITY: {
    label: 'Experience by priority',
    text: 'Sends higher-priority incidents to more experienced technicians and lower-priority ones to less experienced ones.',
  },
};

/** Internal-note text saved when a lead assigns someone other than the engine's top candidate (the assign API has no reason field). */
export function overrideAssignNote(a: { name: string; rank: number; score: number; topName: string | null; topScore: number | null; reason: string }): string {
  const top = a.topName ? `${a.topName}${a.topScore != null ? ` (${a.topScore}%)` : ''}` : 'the top match';
  return `Assigned to ${a.name} (rank ${a.rank}, ${a.score}%) instead of ${top}, the engine's first choice. Reason: ${a.reason}`;
}
