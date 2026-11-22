import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLiveDashboard, type DashboardEvent } from '../api/dashboard';
import { tokens } from '../theme/theme';
import { useLiveEvents, useRealtimeStatus } from '../realtime/realtimeStore';
import { apiErrorMessage } from '../utils/errors';
import { formatTimeSeconds, humanizeEnum } from '../utils/format';
import { ErrorState } from './StateViews';

const priorityTint = (p: DashboardEvent['priority']) => (p ? tokens.priority[p] : tokens.onSurfaceVariant);

export interface LiveEventPulseProps {
  /** Rows to show (default 8). */
  max?: number;
  /** Called when a row with an incident is clicked. */
  onSelect?: (incidentId: number) => void;
}

/**
 * Pulsing dot plus the newest incident events. The first rows come from `GET /dashboard/live`
 * (`recentEvents`); events pushed on `/topic/dashboard` (administrators) are put in front as they arrive.
 */
export default function LiveEventPulse({ max = 8, onSelect }: LiveEventPulseProps) {
  const live = useLiveEvents();
  const status = useRealtimeStatus();
  const first = useQuery({ queryKey: ['dashboard', 'live', 'pulse'], queryFn: getLiveDashboard, refetchInterval: 30_000 });
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (live.length) setFlash((n) => n + 1);
  }, [live.length]);

  const seen = new Set<string>();
  const rows = [...live, ...(first.data?.recentEvents ?? [])]
    .filter((e): e is DashboardEvent => Boolean(e && e.type))
    .filter((e) => {
      const k = `${e.type}|${e.incidentId}|${e.at}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, max);

  if (first.isError && !rows.length) return <ErrorState message={apiErrorMessage(first.error)} onRetry={() => first.refetch()} />;

  return (
    <Box aria-live="polite" sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          key={flash}
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: status === 'connected' ? tokens.success : tokens.textDisabled,
            '@keyframes eventPing': {
              '0%': { boxShadow: `0 0 0 0 ${alpha(tokens.success, 0.7)}` },
              '100%': { boxShadow: `0 0 0 12px ${alpha(tokens.success, 0)}` },
            },
            animation: flash ? 'eventPing 1.1s ease-out 1' : 'none',
          }}
        />
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Live events
        </Typography>
      </Box>
      {!rows.length && (
        <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>No incident events yet.</Typography>
      )}
      {rows.map((e) => {
        const clickable = !!onSelect && !!e.incidentId;
        return (
          <Box
            key={`${e.type}|${e.incidentId}|${e.at}`}
            component={clickable ? 'button' : 'div'}
            type={clickable ? 'button' : undefined}
            onClick={clickable ? () => onSelect?.(e.incidentId as number) : undefined}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 0.8,
              borderRadius: '6px',
              border: 0,
              textAlign: 'left',
              bgcolor: tokens.hover,
              color: tokens.onSurface,
              cursor: clickable ? 'pointer' : 'default',
              borderLeft: `3px solid ${priorityTint(e.priority)}`,
            }}
          >
            <Typography sx={{ fontSize: 12, fontFamily: tokens.fontMono, color: tokens.onSurfaceVariant, minWidth: 64 }}>
              {formatTimeSeconds(e.at)}
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: tokens.fontMono }}>{e.code ?? '-'}</Typography>
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, flexGrow: 1 }}>
              {humanizeEnum(e.type)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
