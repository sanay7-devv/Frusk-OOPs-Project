import { useSyncExternalStore } from 'react';
import { Box, Typography } from '@mui/material';
import { Pause as PauseIcon, Check as CheckIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import type { SlaState } from '../api/types';
import { slaStateColor } from '../theme/theme';

// One shared 1-second ticker for every mounted SlaCountdown.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let tick = Date.now();

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    tick = Date.now();
    timer = setInterval(() => {
      tick = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const getSnapshot = () => tick;

function fmt(ms: number) {
  const s = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${s % 60}s`;
}

const mono = { fontFamily: 'JetBrains Mono, monospace', fontSize: 12 } as const;

/**
 * Counts down to the server's due timestamp. The colour comes from the server `slaState`;
 * this component never works out an SLA state itself.
 * `remainingSeconds` is optional: when the server reports time left on a paused clock, pass it.
 */
export default function SlaCountdown({
  due,
  slaState,
  remainingSeconds,
}: {
  due: string | null;
  /** Kept so existing callers still compile; no longer used. */
  createdAt?: string;
  slaState: SlaState;
  remainingSeconds?: number | null;
}) {
  const now = useSyncExternalStore(subscribe, getSnapshot);
  const color = slaStateColor[slaState] ?? slaStateColor.OK;

  if (slaState === 'MET') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color }}>
        <CheckIcon sx={{ fontSize: 14 }} />
        <Typography sx={{ ...mono, fontWeight: 600 }}>Met</Typography>
      </Box>
    );
  }

  if (slaState === 'PAUSED') {
    const known = remainingSeconds != null && remainingSeconds >= 0;
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color }}>
        <PauseIcon sx={{ fontSize: 14 }} />
        <Typography sx={{ ...mono, fontWeight: 500 }}>
          Paused{known ? `, ${fmt(remainingSeconds * 1000)} left` : ''}
        </Typography>
      </Box>
    );
  }

  if (!due) {
    return <Typography sx={{ ...mono, color: slaStateColor.PAUSED }}>-</Typography>;
  }

  const left = new Date(due).getTime() - now;
  let text: string;
  if (slaState === 'VIOLATED') text = left < 0 ? `Overdue ${fmt(left)}` : 'Violated';
  else text = left > 0 ? `${fmt(left)} left` : 'Due now';

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color }}>
      <ScheduleIcon sx={{ fontSize: 14 }} />
      <Typography sx={{ ...mono, fontWeight: slaState === 'VIOLATED' ? 700 : 600 }}>{text}</Typography>
    </Box>
  );
}
