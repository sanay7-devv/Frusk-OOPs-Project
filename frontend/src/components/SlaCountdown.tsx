import { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import { Pause as PauseIcon, Check as CheckIcon } from '@mui/icons-material';
import type { SlaState } from '../api/types';

/** Counts from the server's due timestamp (not from page load). Never computes SLA state itself. */
export default function SlaCountdown({ due, createdAt, slaState }: { due: string | null; createdAt: string; slaState: SlaState }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (slaState === 'MET') return <Typography color="success.main"><CheckIcon fontSize="inherit" /> Met</Typography>;
  if (slaState === 'PAUSED') return <Typography color="text.secondary"><PauseIcon fontSize="inherit" /> Paused</Typography>;
  if (!due) return <Typography color="text.secondary">-</Typography>;

  const dueMs = new Date(due).getTime();
  const left = dueMs - now;
  const total = dueMs - new Date(createdAt).getTime();
  const fmt = (ms: number) => { const s = Math.floor(Math.abs(ms) / 1000); const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${s % 60}s`; };
  if (left < 0) return <Typography color="error.main">Overdue {fmt(left)}</Typography>;
  const color = left / total < 0.25 ? 'warning.main' : 'success.main';
  return <Typography color={color}>{fmt(left)} left</Typography>;
}
