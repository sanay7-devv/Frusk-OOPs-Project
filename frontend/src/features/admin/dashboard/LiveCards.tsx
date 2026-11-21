import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  WarningAmber as WarningIcon,
  RssFeed as LiveIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  PriorityHigh as PriorityIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tokens, priorityColor } from '../../../theme/theme';
import { getLiveDashboard, type DashboardEvent, type DashboardEventType } from '../../../api/dashboard';
import type { IncidentSummary } from '../../../api/types';
import { ChartCard } from '../reports/common';
import { EmptyState } from '../../../components/StateViews';
import { tone } from '../palette';

const EVENT_TEXT: Record<DashboardEventType, string> = {
  INCIDENT_CREATED: 'Incident Reported',
  INCIDENT_ASSIGNED: 'Ticket Assigned',
  INCIDENT_ACKNOWLEDGED: 'Acknowledged',
  PRIORITY_CHANGED: 'Priority Changed',
  INFO_REQUESTED: 'More Info Requested',
  INFO_PROVIDED: 'Information Provided',
  SLA_WARNING: 'SLA Warning',
  SLA_VIOLATED: 'SLA Breached',
  INCIDENT_ESCALATED: 'Escalated Tier',
  INCIDENT_RESOLVED: 'Incident Resolved',
  INCIDENT_VERIFIED: 'Resolution Verified',
  INCIDENT_CLOSED: 'Incident Closed',
  INCIDENT_REOPENED: 'Incident Reopened',
  DUPLICATE_SUSPECTED: 'Possible Duplicate',
  TRIAGE_NEEDED: 'Triage Required',
};

const EVENT_COLOR: Partial<Record<DashboardEventType, string>> = {
  SLA_VIOLATED: tone.danger,
  INCIDENT_ESCALATED: tone.danger,
  SLA_WARNING: tone.caution,
  TRIAGE_NEEDED: tone.caution,
  INCIDENT_RESOLVED: tone.success,
  INCIDENT_VERIFIED: tone.success,
  INCIDENT_CLOSED: tone.success,
};

function AttentionList({ items }: { items: IncidentSummary[] }) {
  return (
    <Stack
      spacing={1.2}
      sx={{
        maxHeight: 360,
        overflowY: 'auto',
        pr: 0.6,
        '&::-webkit-scrollbar': { width: 5 },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: alpha(tokens.white, 0.12),
          borderRadius: 4,
          '&:hover': { bgcolor: alpha(tokens.white, 0.25) },
        },
      }}
    >
      {items.map((i) => {
        const isViolated = i.slaState === 'VIOLATED';
        const accentCol = isViolated ? tone.danger : tone.caution;
        const pColor = i.priority ? priorityColor[i.priority] : tokens.onSurfaceVariant;

        return (
          <Box
            key={i.id}
            component={RouterLink}
            to={`/admin/tickets/${i.id}`}
            sx={{
              display: 'block',
              p: 1.4,
              borderRadius: '10px',
              textDecoration: 'none',
              bgcolor: alpha(tokens.surfaceContainerLowest, 0.5),
              border: `1px solid ${tokens.outlineVariant}`,
              borderLeft: `3.5px solid ${accentCol}`,
              transition: 'all 0.18s ease',
              position: 'relative',
              '&:hover': {
                bgcolor: alpha(tokens.surfaceContainerHigh, 0.7),
                borderColor: alpha(accentCol, 0.45),
                transform: 'translateX(2px)',
                boxShadow: `0 4px 16px -4px ${alpha(accentCol, 0.2)}`,
                '& .hover-arrow': {
                  opacity: 1,
                  transform: 'translateX(0)',
                },
              },
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.6 }}>
              <Stack direction="row" spacing={0.8} alignItems="center">
                {i.priority && (
                  <Chip
                    size="small"
                    label={i.priority}
                    sx={{
                      height: 19,
                      fontSize: 10.5,
                      fontWeight: 700,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: pColor,
                      bgcolor: alpha(pColor, 0.12),
                      border: `1px solid ${alpha(pColor, 0.35)}`,
                    }}
                  />
                )}
                <Typography
                  sx={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    fontWeight: 600,
                    color: tokens.white,
                  }}
                >
                  {i.code}
                </Typography>
              </Stack>
              <Chip
                size="small"
                label={isViolated ? 'SLA Violated' : 'SLA At Risk'}
                sx={{
                  height: 19,
                  fontSize: 10,
                  fontWeight: 700,
                  color: accentCol,
                  bgcolor: alpha(accentCol, 0.12),
                  border: `1px solid ${alpha(accentCol, 0.3)}`,
                  letterSpacing: '0.02em',
                }}
              />
            </Stack>

            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: tokens.white,
                mb: 0.5,
                lineHeight: 1.3,
              }}
              noWrap
            >
              {i.title}
            </Typography>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontSize: 11.5, color: tokens.textDisabled }}>
                {i.service?.name || 'General'}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography
                  sx={{
                    fontSize: 11.5,
                    color: i.assignee ? tokens.secondaryLight : tokens.amber,
                    fontWeight: 500,
                  }}
                >
                  {i.assignee ? i.assignee.name : 'Unassigned'}
                </Typography>
                <ChevronRightIcon
                  className="hover-arrow"
                  sx={{
                    fontSize: 15,
                    color: tokens.secondaryLight,
                    opacity: 0,
                    transform: 'translateX(-4px)',
                    transition: 'all 0.15s ease',
                  }}
                />
              </Stack>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

function FeedList({ events = [] }: { events?: DashboardEvent[] }) {
  const validEvents = (events || []).filter((e): e is DashboardEvent => Boolean(e && e.type));
  return (
    <Stack
      spacing={1}
      sx={{
        maxHeight: 360,
        overflowY: 'auto',
        pr: 0.6,
        '&::-webkit-scrollbar': { width: 5 },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: alpha(tokens.white, 0.12),
          borderRadius: 4,
          '&:hover': { bgcolor: alpha(tokens.white, 0.25) },
        },
      }}
    >
      {validEvents.map((e, idx) => {
        const evType = e.type;
        const evColor = (evType && EVENT_COLOR[evType]) ?? tokens.primaryLight;
        const pColor = e.priority ? priorityColor[e.priority] : undefined;
        const isAlert = evType === 'SLA_VIOLATED' || evType === 'INCIDENT_ESCALATED';

        const body = (
          <Box
            sx={{
              p: 1.2,
              borderRadius: '8px',
              bgcolor: alpha(tokens.surfaceContainerLowest, 0.4),
              border: `1px solid ${isAlert ? alpha(tone.danger, 0.25) : tokens.outlineVariant}`,
              borderLeft: `3px solid ${evColor}`,
              transition: 'all 0.15s ease',
              '&:hover': e.incidentId
                ? {
                    bgcolor: alpha(tokens.surfaceContainerHigh, 0.6),
                    borderColor: alpha(evColor, 0.4),
                    transform: 'translateX(2px)',
                  }
                : undefined,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
              <Typography
                sx={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: evColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.6,
                }}
              >
                {EVENT_TEXT[e.type] ?? e.type}
              </Typography>
              <Typography
                sx={{
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: tokens.textDisabled,
                }}
              >
                {new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
              {e.code && (
                <Typography
                  sx={{
                    fontSize: 11.5,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                    color: tokens.white,
                  }}
                >
                  {e.code}
                </Typography>
              )}
              {pColor && e.priority && (
                <Chip
                  size="small"
                  label={e.priority}
                  sx={{
                    height: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: pColor,
                    bgcolor: alpha(pColor, 0.12),
                    border: `1px solid ${alpha(pColor, 0.3)}`,
                  }}
                />
              )}
              {e.status && (
                <Typography sx={{ fontSize: 11, color: tokens.onSurfaceVariant, textTransform: 'capitalize' }}>
                  • {e.status.replace(/_/g, ' ').toLowerCase()}
                </Typography>
              )}
            </Stack>
          </Box>
        );

        return e.incidentId ? (
          <Box
            key={`${e.at}-${idx}`}
            component={RouterLink}
            to={`/admin/tickets/${e.incidentId}`}
            sx={{ textDecoration: 'none' }}
          >
            {body}
          </Box>
        ) : (
          <Box key={`${e.at}-${idx}`}>{body}</Box>
        );
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
      icon={<WarningIcon sx={{ fontSize: 19, color: tone.danger }} />}
      borderTopColor={tone.danger}
      badge={
        query.data && query.data.atRisk?.length > 0 ? (
          <Chip
            size="small"
            label={`${query.data.atRisk.length} at risk`}
            sx={{
              height: 19,
              fontSize: 10,
              fontWeight: 700,
              bgcolor: alpha(tone.danger, 0.15),
              color: tone.danger,
              border: `1px solid ${alpha(tone.danger, 0.3)}`,
            }}
          />
        ) : undefined
      }
      action={
        <Typography
          component={RouterLink}
          to="/admin/incidents"
          sx={{
            fontSize: 12,
            fontWeight: 600,
            color: tokens.secondaryLight,
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          View tickets →
        </Typography>
      }
    >
      {(d) =>
        d.atRisk.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: alpha(tokens.success, 0.12),
                border: `1px solid ${alpha(tokens.success, 0.3)}`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
              }}
            >
              <CheckIcon sx={{ fontSize: 24, color: tokens.success }} />
            </Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.white, mb: 0.3 }}>
              All tickets healthy
            </Typography>
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
              No SLA breaches or at-risk incidents right now.
            </Typography>
          </Box>
        ) : (
          <AttentionList items={d.atRisk} />
        )
      }
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
      emptyMessage="No recent activity recorded."
      icon={<LiveIcon sx={{ fontSize: 19, color: tokens.primaryLight }} />}
      borderTopColor={tokens.primary}
      badge={
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 0.7,
            py: 0.1,
            borderRadius: 999,
            bgcolor: alpha(tokens.success, 0.12),
            border: `1px solid ${alpha(tokens.success, 0.3)}`,
          }}
        >
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: tokens.success,
              boxShadow: `0 0 6px ${tokens.success}`,
            }}
          />
          <Typography
            sx={{
              fontSize: 9.5,
              fontWeight: 700,
              color: tokens.successLight,
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.04em',
            }}
          >
            REALTIME
          </Typography>
        </Box>
      }
      action={
        <Typography
          component={RouterLink}
          to="/admin/audit"
          sx={{
            fontSize: 12,
            fontWeight: 600,
            color: tokens.secondaryLight,
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          Audit log →
        </Typography>
      }
    >
      {(d) => <FeedList events={d.recentEvents} />}
    </ChartCard>
  );
}
