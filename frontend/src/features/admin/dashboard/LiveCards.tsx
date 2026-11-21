import { Box, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tokens, priorityColor } from '../../../theme/theme';
import { getLiveDashboard, type DashboardEvent, type DashboardEventType } from '../../../api/dashboard';
import type { IncidentSummary } from '../../../api/types';
import { ChartCard } from '../reports/common';
import { EmptyState } from '../../../components/StateViews';
import { tone } from '../palette';
import { formatTime } from '../../../utils/format';

const EVENT_TEXT: Record<DashboardEventType, string> = {
  INCIDENT_CREATED: 'Reported', INCIDENT_ASSIGNED: 'Assigned', INCIDENT_ACKNOWLEDGED: 'Acknowledged',
  PRIORITY_CHANGED: 'Priority changed', INFO_REQUESTED: 'More information requested', INFO_PROVIDED: 'Information provided',
  SLA_WARNING: 'SLA warning', SLA_VIOLATED: 'SLA violated', INCIDENT_ESCALATED: 'Escalated', INCIDENT_RESOLVED: 'Resolved',
  INCIDENT_VERIFIED: 'Verified', INCIDENT_CLOSED: 'Closed', INCIDENT_REOPENED: 'Reopened',
  DUPLICATE_SUSPECTED: 'Possible duplicate', TRIAGE_NEEDED: 'Needs triage',
};
const EVENT_COLOR: Partial<Record<DashboardEventType, string>> = {
  SLA_VIOLATED: tone.danger, INCIDENT_ESCALATED: tone.danger, SLA_WARNING: tone.caution, TRIAGE_NEEDED: tone.caution,
  INCIDENT_RESOLVED: tone.success, INCIDENT_VERIFIED: tone.success, INCIDENT_CLOSED: tone.success,
};

const SLA_TEXT: Record<string, string> = { VIOLATED: 'SLA violated', AT_RISK: 'SLA at risk', WARNING: 'SLA warning' };

function AttentionList({ items }: { items: IncidentSummary[] }) {
  return (
    <Stack spacing={1}>
      {items.slice(0, 4).map((i) => (
        <Box
          key={i.id}
          component={RouterLink}
          to={`/admin/tickets/${i.id}`}
          sx={{ display: 'block', p: 1.25, borderRadius: '8px', textDecoration: 'none', border: `1px solid ${tokens.outlineVariant}`, '&:hover': { bgcolor: tokens.surfaceContainerHigh } }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {i.priority && (
              <Chip size="small" label={i.priority} sx={{ height: 22, fontSize: 12, fontWeight: 700, color: priorityColor[i.priority], bgcolor: 'transparent', border: `1px solid ${priorityColor[i.priority]}` }} />
            )}
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{i.code}</Typography>
            <Typography sx={{ fontSize: 12, color: i.slaState === 'VIOLATED' ? tone.danger : tone.caution }}>{SLA_TEXT[i.slaState] ?? i.slaState}</Typography>
          </Stack>
          <Typography sx={{ fontSize: 14, color: tokens.onSurface, mt: 0.5 }} noWrap>{i.title}</Typography>
          <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
            {i.service.name}, {i.assignee ? `assigned to ${i.assignee.name}` : 'unassigned'}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function FeedList({ events }: { events: DashboardEvent[] }) {
  return (
    <Stack spacing={0.5}>
      {events.slice(0, 6).map((e, idx) => {
        const body = (
          <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ p: 1, borderRadius: '8px', '&:hover': e.incidentId ? { bgcolor: tokens.surfaceContainerHigh } : undefined }}>
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, minWidth: 64 }}>
              {formatTime(e.at)}
            </Typography>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, color: EVENT_COLOR[e.type] ?? tokens.onSurface, fontWeight: 600 }}>{EVENT_TEXT[e.type] ?? e.type}</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                {[e.code, e.priority, e.status?.replace(/_/g, ' ').toLowerCase()].filter(Boolean).join(', ')}
              </Typography>
            </Box>
          </Stack>
        );
        return e.incidentId
          ? <Box key={`${e.at}-${idx}`} component={RouterLink} to={`/admin/tickets/${e.incidentId}`} sx={{ textDecoration: 'none' }}>{body}</Box>
          : <Box key={`${e.at}-${idx}`}>{body}</Box>;
      })}
    </Stack>
  );
}

/** Needs attention and Live feed share one query (`GET /dashboard/live`, also refreshed by the realtime hook). */
export function AttentionCard() {
  const query = useQuery({ queryKey: ['dashboard', 'live'], queryFn: getLiveDashboard, refetchInterval: 30_000 });
  return (
    <ChartCard
      title="Needs attention"
      query={query}
      isEmpty={() => false}
      emptyMessage=""
      action={<Typography component={RouterLink} to="/admin/tickets?tab=all&status=ACTIVE" sx={{ fontSize: 12, color: tokens.secondaryLight }}>View incidents</Typography>}
    >
      {(d) => (d.atRisk.length === 0 ? <EmptyState compact message="Nothing needs attention right now." /> : <AttentionList items={d.atRisk} />)}
    </ChartCard>
  );
}

export function LiveFeedCard() {
  const query = useQuery({ queryKey: ['dashboard', 'live'], queryFn: getLiveDashboard, refetchInterval: 30_000 });
  return (
    <ChartCard
      title="Live feed"
      query={query}
      isEmpty={(d) => d.recentEvents.length === 0}
      emptyMessage="No recent activity."
      action={<Typography component={RouterLink} to="/admin/audit" sx={{ fontSize: 12, color: tokens.secondaryLight }}>Audit log</Typography>}
    >
      {(d) => <FeedList events={d.recentEvents} />}
    </ChartCard>
  );
}
